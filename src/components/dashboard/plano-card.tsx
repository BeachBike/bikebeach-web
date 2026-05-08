import { Link } from 'react-router';
import { useState } from 'react';
import type { CreditPack, MySubscription } from '@/api/me';
import { ConfirmModal } from '@/components/common';
import { daysUntil, formatFullDate } from '@/lib/format';

interface Props {
  packs: CreditPack[] | undefined;
  subscriptions: MySubscription[] | undefined;
  onCancelSubscription: (subscriptionId: string) => void;
  isCancelingSubscription: boolean;
}

const UNLIMITED_THRESHOLD = 999;

/// Plan + pack card. When the user has BOTH an active monthly subscription
/// AND a purchase pack with credits, the card splits into two stacked
/// sections so each shows its own progress and expiry. When the monthly
/// plan is "unlimited" (`monthlyCredits >= 999`), the progress bar is
/// replaced by a single pill — no count makes sense for unlimited.
export function PlanoCard({
  packs,
  subscriptions,
  onCancelSubscription,
  isCancelingSubscription,
}: Props) {
  const now = new Date();
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const activePacks = (packs ?? []).filter(
    (p) =>
      p.remainingCredits > 0 &&
      (!p.expiresAt || new Date(p.expiresAt) > now),
  );
  const activeSub = (subscriptions ?? []).find(
    (s) =>
      s.status === 'ACTIVE' ||
      s.status === 'PENDING_PAYMENT' ||
      s.status === 'PAST_DUE' ||
      (s.status === 'CANCELLED' && new Date(s.currentPeriodEnd) > now),
  );

  const monthlyPack = activeSub
    ? activePacks.find((p) => p.source === 'SUBSCRIPTION_CYCLE')
    : undefined;
  const purchasePacks = activePacks
    .filter((p) => p.source === 'PURCHASE_PACK')
    .sort((a, b) => b.totalCredits - a.totalCredits);
  const mainPurchasePack = purchasePacks[0];

  const isAwaitingMonthlyCredits =
    !!activeSub &&
    (activeSub.status === 'PENDING_PAYMENT' ||
      (activeSub.status === 'PAST_DUE' && !monthlyPack));

  // Empty state
  if (!activeSub && activePacks.length === 0) {
    return (
      <div className="col-span-12 flex min-h-[340px] flex-col justify-between rounded-[22px] bg-cream-2 p-7 lg:col-span-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            seu plano atual
          </div>
          <div
            className="display-tight mt-3.5"
            style={{ fontSize: 48, lineHeight: 1 }}
          >
            sem plano
          </div>
          <p className="mt-2 text-sm text-ink-2">
            Compre um pacote ou assine o mensal pra reservar bikes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/planos"
            className="flex-1 rounded-full bg-ink px-4 py-3.5 text-center text-sm font-semibold text-cream"
          >
            ver planos
          </Link>
        </div>
      </div>
    );
  }

  const showBothSections =
    !!activeSub && !!mainPurchasePack;

  return (
    <div className="col-span-12 flex min-h-[340px] flex-col justify-between rounded-[22px] bg-cream-2 p-7 lg:col-span-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-clay">
          {showBothSections ? 'seu plano + pacote' : 'seu plano atual'}
        </div>

        {/* Primary section — subscription if exists, otherwise main pack */}
        {activeSub ? (
          <SubscriptionSection
            sub={activeSub}
            monthlyPack={monthlyPack}
            isAwaitingCredits={isAwaitingMonthlyCredits}
          />
        ) : (
          <PackSection pack={mainPurchasePack!} />
        )}

        {/* Secondary section — only when both are active */}
        {showBothSections && (
          <div className="mt-5 border-t border-sand pt-5">
            <PackSection pack={mainPurchasePack!} compact />
          </div>
        )}

        {/* Multiple purchase packs hint */}
        {!showBothSections && purchasePacks.length > 1 && (
          <div className="mt-4 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-[13px] leading-snug text-clay-d">
            Você tem {purchasePacks.length} pacotes ativos. O sistema usa
            primeiro o crédito que vence mais cedo.
          </div>
        )}
        {(activeSub?.status === 'PAST_DUE' ||
          activeSub?.status === 'PENDING_PAYMENT') && (
          <div className="mt-4 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-[13px] leading-snug text-clay-d">
            {activeSub.status === 'PENDING_PAYMENT'
              ? 'A assinatura foi criada, mas ainda não está ativa.'
              : 'A mensalidade está pendente.'}{' '}
            Créditos mensais só entram depois da confirmação do pagamento pela
            Asaas.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          to="/planos"
          className="flex-1 rounded-full bg-ink px-4 py-3.5 text-center text-sm font-semibold text-cream"
        >
          {activeSub ? 'mudar plano' : 'renovar'}
        </Link>
        {!activeSub && (
          <Link
            to="/planos"
            className="flex-1 rounded-full border-[1.5px] border-ink px-4 py-3.5 text-center text-sm font-semibold"
          >
            ver mensais
          </Link>
        )}
        {activeSub && activeSub.status !== 'CANCELLED' && (
          <button
            type="button"
            disabled={isCancelingSubscription}
            onClick={() => setConfirmCancelOpen(true)}
            className="basis-full rounded-full border-[1.5px] border-clay px-4 py-3.5 text-center text-sm font-semibold text-clay disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelingSubscription ? 'cancelando…' : 'cancelar mensal'}
          </button>
        )}
      </div>

      <ConfirmModal
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          if (activeSub) onCancelSubscription(activeSub.id);
          setConfirmCancelOpen(false);
        }}
        title="cancelar a assinatura mensal?"
        description={
          activeSub ? (
            <>
              A renovação automática para agora.{' '}
              <b className="text-ink">
                Os créditos já pagos seguem válidos até{' '}
                {formatFullDate(activeSub.currentPeriodEnd)}
              </b>
              , então você pode continuar reservando até lá.
            </>
          ) : null
        }
        confirmLabel="cancelar mensal"
        cancelLabel="manter"
        confirmTone="clay"
        loading={isCancelingSubscription}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function SubscriptionSection({
  sub,
  monthlyPack,
  isAwaitingCredits,
}: {
  sub: MySubscription;
  monthlyPack: CreditPack | undefined;
  isAwaitingCredits: boolean;
}) {
  const isUnlimited = sub.plan.monthlyCredits >= UNLIMITED_THRESHOLD;
  const total = isAwaitingCredits ? 0 : sub.plan.monthlyCredits;
  const usadas = monthlyPack
    ? monthlyPack.totalCredits - monthlyPack.remainingCredits
    : 0;
  const pct = total > 0 && !isUnlimited ? (usadas / total) * 100 : 0;

  const detailsLine =
    sub.status === 'CANCELLED'
      ? `cancelado · vale até ${formatFullDate(sub.currentPeriodEnd)}`
      : sub.status === 'PENDING_PAYMENT'
        ? 'aguardando confirmação do pagamento'
        : sub.status === 'PAST_DUE' || !monthlyPack
          ? `pagamento pendente · ciclo até ${formatFullDate(sub.currentPeriodEnd)}`
          : `renova em ${formatFullDate(sub.currentPeriodEnd)}`;

  return (
    <>
      <div
        className="display-tight mt-3.5"
        style={{ fontSize: 48, lineHeight: 1 }}
      >
        {sub.plan.name.toLowerCase()}
      </div>
      <div className="mt-2 text-sm text-ink-2">{detailsLine}</div>

      {isUnlimited ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-clay px-4 py-2 text-sm font-bold text-cream">
          <span className="text-base">∞</span> ilimitado
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-[13px] font-semibold text-ink-2">
              aulas usadas no mês
            </span>
            <span className="display-tight" style={{ fontSize: 22 }}>
              {usadas}
              <span className="text-base opacity-50"> / {total}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-clay transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function PackSection({
  pack,
  compact,
}: {
  pack: CreditPack;
  compact?: boolean;
}) {
  const total = pack.totalCredits;
  const usadas = total - pack.remainingCredits;
  const pct = total > 0 ? (usadas / total) * 100 : 0;
  const titleLabel = total === 1 ? 'aula avulsa' : `pacote ${total}`;
  const venceDays = pack.expiresAt ? daysUntil(pack.expiresAt) : null;
  const expirySub = pack.expiresAt
    ? venceDays !== null && venceDays >= 0
      ? `vence em ${venceDays} dia${venceDays === 1 ? '' : 's'}`
      : 'expirado'
    : 'sem expiração';

  if (compact) {
    return (
      <>
        <div className="text-xs font-bold uppercase tracking-wide text-ink-2">
          + {titleLabel}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[13px] font-semibold text-ink-2">
            créditos no pacote
          </span>
          <span className="display-tight" style={{ fontSize: 22 }}>
            {usadas}
            <span className="text-base opacity-50"> / {total}</span>
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-sea transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[12px] text-ink-2">{expirySub}</div>
      </>
    );
  }

  return (
    <>
      <div
        className="display-tight mt-3.5"
        style={{ fontSize: 48, lineHeight: 1 }}
      >
        {titleLabel}
      </div>
      <div className="mt-2 text-sm text-ink-2">
        comprado em {formatFullDate(pack.createdAt)} · {expirySub}
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-end justify-between">
          <span className="text-[13px] font-semibold text-ink-2">
            aulas usadas
          </span>
          <span className="display-tight" style={{ fontSize: 22 }}>
            {usadas}
            <span className="text-base opacity-50"> / {total}</span>
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-clay transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {total <= 30 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className="h-2 min-w-[14px] flex-1 rounded-[3px]"
                style={{
                  background:
                    i < usadas ? 'var(--color-clay)' : 'var(--color-sand)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
