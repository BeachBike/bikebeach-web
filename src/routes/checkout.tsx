import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, Navigate, useSearchParams } from 'react-router';
import {
  useCreatePixPack,
  usePaymentPolling,
  type CreateCardPackResult,
  type CreatePixPackResult,
} from '@/api/me';
import {
  usePackOffer,
  usePlan,
} from '@/api/public';
import { CardForm } from '@/components/checkout/card-form';
import { CardInReview } from '@/components/checkout/card-in-review';
import { CheckoutSummary } from '@/components/checkout/summary';
import { CheckoutSuccess } from '@/components/checkout/success';
import { CheckoutTopBar } from '@/components/checkout/top-bar';
import { PixPayment } from '@/components/checkout/pix-payment';
import { PIX_DISCOUNT_PERCENT } from '@/lib/constants';
import { resolveDiscount } from '@/lib/discount';
import { useAuthStore } from '@/stores/auth';

/// WhatsApp number used while monthly subscriptions are wired manually.
/// Update this when the studio publishes a different contact.
const SUBSCRIPTION_WHATSAPP =
  'https://wa.me/5547999999999?text=Quero%20assinar%20o%20mensal%20da%20bikebeach';

type Method = 'pix' | 'credito' | 'debito';

const METHOD_LABEL: Record<Method, string> = {
  pix: 'pix',
  credito: 'cartão de crédito',
  debito: 'cartão de débito',
};

/// /checkout?packOfferId=... or /checkout?planId=...
///
/// Pack flow: create PIX charge → poll Payment until status=PAID → success.
/// Plan flow (E9): subscription self-service is paused — render a "em breve"
/// banner pointing the user to WhatsApp instead of calling
/// `useCreateSubscription`. The backend mutation still exists but isn't
/// reached from the UI until we ship the recurring PIX flow.
export function CheckoutRoute() {
  const session = useAuthStore((s) => s.user);
  const [params] = useSearchParams();

  const packOfferId = params.get('packOfferId');
  const planId = params.get('planId');

  const packQ = usePackOffer(packOfferId ?? undefined);
  const planQ = usePlan(planId ?? undefined);

  const [method, setMethod] = useState<Method>('pix');
  const [pix, setPix] = useState<CreatePixPackResult | null>(null);
  const [card, setCard] = useState<CreateCardPackResult | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rastreia o valor financiado quando o usuário muda as parcelas do cartão
  const [financedAmountCents, setFinancedAmountCents] = useState<number | null>(null);

  const pixMutation = useCreatePixPack();

  // Poll the payment we just created. Once it goes to PAID, swap to the
  // success screen. Polling auto-stops when status leaves PENDING/IN_REVIEW.
  // Both PIX (`pix.paymentId`) and a card-in-review (`card.paymentId`) share
  // the same polling — only one is active at a time.
  const activePaymentId =
    pix?.paymentId ?? (card?.status === 'IN_REVIEW' ? card.paymentId : undefined);
  const paymentQ = usePaymentPolling(activePaymentId, {
    enabled: !!activePaymentId,
  });
  // PIX success comes from the polled status; card sync success comes
  // straight from `card.status === 'PAID'`.
  const isPaid =
    paymentQ.data?.status === 'PAID' || card?.status === 'PAID';
  // PIX EXPIRED + generic FAILED for PIX get the "fresh QR" path.
  const isPixDead =
    paymentQ.data?.status === 'EXPIRED' ||
    (paymentQ.data?.status === 'FAILED' && !!pix);

  // A card that started IN_REVIEW and was later reproved by risk analysis
  // surfaces here. Reset to the form so the user can try another card.
  useEffect(() => {
    if (
      card?.status === 'IN_REVIEW' &&
      paymentQ.data?.status === 'FAILED'
    ) {
      setCardError(
        paymentQ.data.failureReason ??
          'A asaas reprovou o cartão. Tenta outro cartão ou outro método.',
      );
      setCard(null);
    }
  }, [card?.status, paymentQ.data?.status, paymentQ.data?.failureReason]);

  if (!session) {
    const next = `/checkout${window.location.search}`;
    return (
      <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
    );
  }

  if (!packOfferId && !planId) {
    return <MissingProductGate />;
  }

  const isPack = !!packOfferId;
  const productName = isPack
    ? packQ.data?.offer.classes === 1
      ? 'aula avulsa'
      : `pacote ${packQ.data?.offer.classes ?? ''}`
    : (planQ.data?.name?.toLowerCase() ?? 'plano mensal');
  const productDesc = isPack
    ? packQ.data
      ? `${packQ.data.offer.classes} aula${
          packQ.data.offer.classes === 1 ? '' : 's'
        } · vale por ${packQ.data.offer.expirationDays} dias`
      : ''
    : planQ.data
      ? `${planQ.data.monthlyCredits >= 999 ? 'aulas ilimitadas' : `${planQ.data.monthlyCredits} aulas / mês`} · cobrança mensal`
      : '';
  const baseCents = isPack
    ? (packQ.data?.offer.priceCents ?? 0)
    : (planQ.data?.priceCents ?? 0);
  // 2026-05 — PIX discount is a system-wide constant (item-14). Compounds
  // with the campaign discount: campaign first, then PIX % on the
  // already-discounted price.
  const pixDiscountPercent = PIX_DISCOUNT_PERCENT;
  const campaignDiscount = isPack && packQ.data
    ? resolveDiscount(packQ.data.offer.priceCents, packQ.data.offer)
    : null;
  const priceAfterCampaign =
    campaignDiscount?.discountedCents ?? baseCents;
  const discountCents =
    isPack && method === 'pix'
      ? // Compound: PIX % off the campaign-discounted price + the
        // campaign cents themselves.
        Math.round((priceAfterCampaign * pixDiscountPercent) / 100) +
        (baseCents - priceAfterCampaign)
      : isPack
        ? baseCents - priceAfterCampaign
        : 0;

  const isLoadingProduct =
    (isPack && packQ.isLoading) || (!isPack && planQ.isLoading);
  const productError =
    (isPack && packQ.isError) || (!isPack && planQ.isError);

  const startPix = () => {
    if (!packOfferId) return;
    setError(null);
    pixMutation.mutate(packOfferId, {
      onSuccess: (data) => setPix(data),
      onError: (err) => setError(extractApiMessage(err)),
    });
  };

  const regeneratePix = () => {
    // Drop the dead charge from local state — this swings the UI back to
    // the PixCTA path, and `startPix` mints a brand-new Asaas charge + QR.
    setPix(null);
    setError(null);
    startPix();
  };

  if (isPaid && (pix || card)) {
    // Card success may include parcelas + last4 — surface them in the
    // method label so the success screen tells the truth about what was
    // charged ("3x no crédito •••• 1234" vs just "cartão de crédito").
    const paidAmount = (pix?.amountCents ?? card?.amountCents) ?? 0;
    const paidMethodLabel =
      card && card.cardLast4
        ? `${card.installments > 1 ? `${card.installments}x no ` : ''}${METHOD_LABEL[method]} •••• ${card.cardLast4}`
        : METHOD_LABEL[method];
    return (
      <div className="min-h-svh bg-cream">
        <CheckoutTopBar />
        <main className="mx-auto max-w-[1200px] px-6 pb-20">
          <CheckoutSuccess
            productName={productName}
            amountCents={paidAmount}
            method={paidMethodLabel}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-cream">
      <CheckoutTopBar />

      <main className="mx-auto max-w-[1200px] px-6 pb-20">
        <div className="pb-2 pt-6">
          <div className="text-[13px] font-semibold text-clay">checkout</div>
          <h1
            className="display-tight mt-1.5"
            style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.92 }}
          >
            tá quase.
            <br />
            <span className="font-normal italic text-ink-2">
              como vai pagar?
            </span>
          </h1>
        </div>

        {isLoadingProduct && (
          <div className="mt-8 rounded-2xl bg-cream-2 px-5 py-12 text-center text-[15px] text-ink-2">
            carregando seu pedido…
          </div>
        )}

        {productError && (
          <div className="mt-8 rounded-2xl border-[1.5px] border-clay/40 bg-clay/10 px-5 py-6 text-sm text-clay-d">
            Não encontrei esse produto. Volta pro{' '}
            <Link to="/dashboard" className="font-semibold underline">
              painel
            </Link>{' '}
            e escolhe um pacote ou plano.
          </div>
        )}

        {!isLoadingProduct && !productError && (
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[22px] border border-sand bg-cream p-7">
              {/* Method tabs — todos os 3 funcionais. Crédito permite até 6x
                  (sem juros até 3x, 2,99% a.m. composto a partir de 4x);
                  débito é sempre à vista. */}
              <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-cream-2 p-1.5">
                <Tab
                  active={method === 'pix'}
                  label="pix"
                  badge={isPack ? `−${pixDiscountPercent}%` : null}
                  onClick={() => setMethod('pix')}
                />
                <Tab
                  active={method === 'credito'}
                  label="crédito"
                  badge="até 6x"
                  onClick={() => setMethod('credito')}
                />
                <Tab
                  active={method === 'debito'}
                  label="débito"
                  badge="À vista"
                  onClick={() => setMethod('debito')}
                />
              </div>

              {/* E9 — subscription self-service is paused. Rather than
                  calling Asaas (which would create an orphan), point the
                  user to WhatsApp until we ship the recurring PIX flow. */}
              {!isPack && (
                <SubscriptionComingSoon
                  planName={planQ.data?.name ?? ''}
                  whatsappUrl={SUBSCRIPTION_WHATSAPP}
                />
              )}

              {/* Pack flow */}
              {isPack && method === 'pix' && (
                <>
                  {!pix ? (
                    <PixCTA
                      isSubmitting={pixMutation.isPending}
                      errorMessage={error}
                      onStart={startPix}
                    />
                  ) : isPixDead ? (
                    <PixExpired
                      isSubmitting={pixMutation.isPending}
                      errorMessage={error}
                      onRegenerate={regeneratePix}
                    />
                  ) : (
                    <PixPayment pix={pix} isPaid={isPaid} />
                  )}
                </>
              )}

              {/* Cartão (crédito + débito) — mesmo form transparente, o que
                  muda é o `billingType` enviado pro backend. PAID resolve
                  síncrono via applyPaymentConfirmation; IN_REVIEW cai no
                  card-in-review + polling do paymentId; FAILED tardio reseta
                  pra form com o motivo. */}
              {isPack &&
                (method === 'credito' || method === 'debito') &&
                packOfferId && (
                <>
                  {cardError && (
                    <div className="mb-4 rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
                      {cardError}
                    </div>
                  )}
                  {card?.status === 'IN_REVIEW' ? (
                    <CardInReview result={card} />
                  ) : (
                    <CardForm
                      packOfferId={packOfferId}
                      amountCents={priceAfterCampaign}
                      billingType={
                        method === 'debito' ? 'DEBIT_CARD' : 'CREDIT_CARD'
                      }
                      installmentMax={method === 'debito' ? 1 : 6}
                      onPaid={(r) => {
                        setCardError(null);
                        setCard(r);
                      }}
                      onInReview={(r) => {
                        setCardError(null);
                        setCard(r);
                      }}
                      onFinancedAmountChange={(cents) =>
                        setFinancedAmountCents(cents)
                      }
                    />
                  )}
                </>
              )}
            </div>

            <CheckoutSummary
              productName={productName}
              productDesc={productDesc}
              baseCents={baseCents}
              discountCents={discountCents}
              showDiscount={isPack}
              pixDiscountPercent={pixDiscountPercent}
              financedAmountCents={
                method !== 'pix' && financedAmountCents
                  ? financedAmountCents
                  : undefined
              }
            />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl bg-cream-2 px-6 py-5">
          <span className="text-2xl">🛡</span>
          <div className="min-w-[240px] flex-1">
            <div className="display-tight" style={{ fontSize: 18 }}>
              pagamento intermediado pela asaas
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              Os dados do seu cartão são processados
              em ambiente certificado PCI-DSS. Recibo automático no seu
              e-mail.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MissingProductGate() {
  return (
    <div className="min-h-svh bg-cream">
      <CheckoutTopBar />
      <main className="mx-auto max-w-[640px] px-6 pb-20 pt-16 text-center">
        <h1
          className="display-tight"
          style={{ fontSize: 48, lineHeight: 1 }}
        >
          escolhe um produto primeiro.
        </h1>
        <p className="mt-3 text-ink-2">
          Volta pra home e escolhe um pacote ou o plano mensal.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-clay px-6 py-3 text-sm font-semibold text-cream"
          >
            ver planos
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full border-[1.5px] border-ink px-6 py-3 text-sm font-semibold"
          >
            painel
          </Link>
        </div>
      </main>
    </div>
  );
}

function Tab({
  active,
  label,
  badge,
  badgeMuted,
  onClick,
}: {
  active: boolean;
  label: string;
  badge: string | null;
  badgeMuted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-semibold transition-colors"
      style={{
        background: active ? 'var(--color-ink)' : 'transparent',
        color: active ? 'var(--color-cream)' : 'var(--color-ink)',
      }}
    >
      {label}
      {badge && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: badgeMuted
              ? 'var(--color-sand)'
              : active
                ? 'var(--color-clay)'
                : 'var(--color-sun)',
            color: badgeMuted
              ? 'var(--color-ink-2)'
              : active
                ? 'var(--color-cream)'
                : 'var(--color-ink)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function PixCTA({
  isSubmitting,
  errorMessage,
  onStart,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div
        className="display-tight"
        style={{ fontSize: 28, lineHeight: 1.05 }}
      >
        gerar QR pix.
      </div>
      <p className="text-sm text-ink-2">
        Vamos criar sua cobrança PIX agora. Assim que aparecer o QR, abre o
        app do banco, escaneia ou cola o código, e o pacote vai pra sua conta
        automaticamente.
      </p>
      {errorMessage && (
        <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
          {errorMessage}
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={isSubmitting}
        className="self-start rounded-full bg-clay px-7 py-4 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'gerando QR…' : 'gerar QR pix →'}
      </button>
    </div>
  );
}

/// Shown when the polled payment turned EXPIRED (Pix QR passed its due
/// date) or FAILED. The previous QR is dead — the only path forward is a
/// fresh charge, so the CTA regenerates it in one tap.
function PixExpired({
  isSubmitting,
  errorMessage,
  onRegenerate,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-clay-d/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-clay-d">
        QR expirou
      </div>
      <div
        className="display-tight"
        style={{ fontSize: 28, lineHeight: 1.05 }}
      >
        esse QR não vale mais.
      </div>
      <p className="text-sm text-ink-2">
        O código PIX tem prazo de validade e o seu passou sem pagamento
        confirmado. Nada foi cobrado. Gere um novo QR pra continuar — leva
        um segundo.
      </p>
      {errorMessage && (
        <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
          {errorMessage}
        </div>
      )}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={isSubmitting}
        className="self-start rounded-full bg-clay px-7 py-4 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'gerando novo QR…' : 'gerar novo QR pix →'}
      </button>
    </div>
  );
}

function SubscriptionComingSoon({
  planName,
  whatsappUrl,
}: {
  planName: string;
  whatsappUrl: string;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-sun/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-clay-d">
        em breve
      </div>
      <div
        className="display-tight"
        style={{ fontSize: 28, lineHeight: 1.05 }}
      >
        assinatura {planName ? `do ${planName.toLowerCase()}` : 'mensal'}{' '}
        sem self-checkout.
      </div>
      <p className="text-sm text-ink-2">
        A cobrança recorrente automática ainda está sendo finalizada. Por
        enquanto, a gente combina a assinatura mensal pelo WhatsApp — leva uns
        2 minutos, e o crédito entra no seu painel logo depois.
      </p>
      <p className="text-sm text-ink-2">
        Pacotes avulsos seguem normais por PIX, é só voltar e escolher um.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 rounded-full bg-clay px-7 py-4 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          falar no whatsapp <span aria-hidden>↗</span>
        </a>
        <Link
          to="/planos"
          className="inline-flex items-center rounded-full border-[1.5px] border-ink px-6 py-4 text-base font-semibold text-ink"
        >
          ver pacotes
        </Link>
      </div>
    </div>
  );
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string | string[]; code?: string }
      | undefined;
    if (data?.code === 'CPF_REQUIRED') {
      return 'Você precisa cadastrar seu CPF antes de comprar.';
    }
    if (Array.isArray(data?.message)) return data!.message!.join(' · ');
    if (typeof data?.message === 'string') return data!.message!;
  }
  return 'Algo deu errado. Tenta de novo em alguns segundos.';
}
