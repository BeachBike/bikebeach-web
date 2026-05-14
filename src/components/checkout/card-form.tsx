import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  useCreateCardPack,
  type CreateCardPackResult,
} from '@/api/me';
import { useMe } from '@/api/me';
import {
  detectCardBrand,
  digitsOnly,
  isExpiryInFuture,
  isValidLuhn,
  maskCardNumber,
  maskCep,
  maskCpf,
  maskExpiry,
  maskPhone,
  splitExpiry,
} from '@/lib/card-utils';
import { computeFinancedTotalCents } from '@/lib/constants';

interface Props {
  packOfferId: string;
  amountCents: number;
  billingType: 'CREDIT_CARD' | 'DEBIT_CARD';
  installmentMax?: number;
  /// PAID = approved synchronously; the parent transitions to success.
  onPaid: (result: CreateCardPackResult) => void;
  /// IN_REVIEW = held for risk analysis; parent shows the polling screen.
  onInReview: (result: CreateCardPackResult) => void;
  /// Called whenever the financed total (including interest) changes when
  /// installments change. Allows parent to update summary display.
  onFinancedAmountChange?: (cents: number) => void;
}

type Field =
  | 'number'
  | 'holderName'
  | 'expiry'
  | 'ccv'
  | 'cpf'
  | 'cep'
  | 'addressNumber'
  | 'phone';

type Errors = Partial<Record<Field | 'top', string>>;

/// Transparent card checkout — the form lives in our UI but the card data
/// flows: this component → backend → Asaas. Nothing about the card is ever
/// persisted client-side: we don't write to localStorage, don't put the
/// payload in the React Query cache (the mutation discards it), and disable
/// retry so a network blip can never silently double-charge.
export function CardForm({
  packOfferId,
  amountCents,
  billingType,
  installmentMax = 6,
  onPaid,
  onInReview,
  onFinancedAmountChange,
}: Props) {
  const meQ = useMe();
  const mutation = useCreateCardPack();

  // All sensitive fields live in component state only — they exit memory
  // when the user navigates away and are never sent to any cache/store.
  const [number, setNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ccv, setCcv] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [phone, setPhone] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);

  const [errors, setErrors] = useState<Errors>({});
  const isDebit = billingType === 'DEBIT_CARD';

  // Prefill holder info from the user profile when it arrives — saves
  // typing for the common case. User can still override every field.
  const me = meQ.data;
  const prefilled = useMemo(() => ({
    holderName: holderName,
    cpf: cpf || (me?.cpf ? maskCpf(me.cpf) : ''),
    phone: phone || (me?.phone ? maskPhone(me.phone) : ''),
  }), [me, holderName, cpf, phone]);

  const brand = useMemo(() => detectCardBrand(number), [number]);
  const effectiveInstallments = isDebit ? 1 : installmentCount;
  const financedTotalCents = computeFinancedTotalCents(
    amountCents,
    effectiveInstallments,
  );
  const total = formatMoney(financedTotalCents);

  // Notify parent whenever the financed amount changes (e.g. user changes
  // installments from 1x to 4x). This allows the summary to reflect the
  // true total the customer will be charged (cash price + interest).
  useEffect(() => {
    onFinancedAmountChange?.(financedTotalCents);
  }, [financedTotalCents, onFinancedAmountChange]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!isValidLuhn(number)) e.number = 'número inválido';
    if (holderName.trim().length < 2) e.holderName = 'informe o nome impresso';
    if (!isExpiryInFuture(expiry)) e.expiry = 'validade inválida';
    if (digitsOnly(ccv).length < 3) e.ccv = '3 ou 4 dígitos';
    const cpfDigits = digitsOnly(prefilled.cpf);
    if (cpfDigits.length !== 11) e.cpf = 'cpf incompleto';
    if (digitsOnly(cep).length !== 8) e.cep = 'cep incompleto';
    if (addressNumber.trim().length < 1) e.addressNumber = 'obrigatório';
    if (digitsOnly(prefilled.phone).length < 10) e.phone = 'telefone incompleto';
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const exp = splitExpiry(expiry);
    if (!exp || !me) return;

    mutation.mutate(
      {
        packOfferId,
        billingType,
        installmentCount: effectiveInstallments,
        creditCard: {
          holderName: holderName.trim().toUpperCase(),
          number: digitsOnly(number),
          expiryMonth: exp.expiryMonth,
          expiryYear: exp.expiryYear,
          ccv: digitsOnly(ccv),
        },
        creditCardHolderInfo: {
          name: holderName.trim(),
          email: me.email,
          cpfCnpj: digitsOnly(prefilled.cpf),
          postalCode: digitsOnly(cep),
          addressNumber: addressNumber.trim(),
          addressComplement: addressComplement.trim() || undefined,
          phone: digitsOnly(prefilled.phone),
        },
      },
      {
        onSuccess: (data) => {
          // Wipe the sensitive fields the moment the API call returns —
          // success or otherwise, we don't need them again.
          setNumber('');
          setCcv('');
          setExpiry('');
          if (data.status === 'PAID') onPaid(data);
          else onInReview(data);
        },
        onError: (err) => {
          const apiMsg = extractApiMessage(err);
          setErrors({ top: apiMsg });
        },
      },
    );
  };

  const submitting = mutation.isPending;
  const perInstallment = financedTotalCents / 100 / effectiveInstallments;

  return (
    // Single-column form — the checkout already places this inside a
    // narrow column next to the sticky order summary. A nested side-by-side
    // (preview | fields) collapsed the field column at lg+ widths and the
    // inputs ran under the summary card. Stacked layout keeps the fields
    // full-width at every breakpoint.
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Animated card preview — sits above the fields, never overlaps */}
      <div className="mx-auto w-full max-w-[360px]">
        <div
          className="relative overflow-hidden rounded-[18px] p-5 text-cream shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)]"
          style={{
            background:
              'linear-gradient(135deg, var(--color-ink) 0%, #3a2f24 100%)',
            aspectRatio: '1.586/1',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(circle, var(--color-clay), transparent 70%)',
            }}
          />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div className="grid h-[34px] w-[46px] place-items-center rounded-md bg-sun text-[10px] font-bold text-ink">
                chip
              </div>
              <span className="text-[12px] font-bold uppercase tracking-wide opacity-70">
                {brand ?? '—'}
              </span>
            </div>
            <div
              className="mono mt-auto text-lg tracking-[0.18em]"
              style={{ fontWeight: 500 }}
            >
              {number || '•••• •••• •••• ••••'}
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-wide">
              <div>
                <div className="opacity-60">titular</div>
                <div className="mt-0.5 text-xs font-semibold">
                  {holderName.toUpperCase() || 'seu nome aqui'}
                </div>
              </div>
              <div>
                <div className="opacity-60">vence</div>
                <div className="mono mt-0.5 text-xs font-semibold">
                  {expiry || 'mm/aa'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-2">
          O cartão é processado pela <b>asaas</b> em ambiente PCI-DSS. Os
          dados não ficam salvos no nosso servidor.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="número do cartão" error={errors.number}>
          <input
            value={number}
            onChange={(e) => setNumber(maskCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            autoComplete="cc-number"
            // Visual cap = digits + spaces (16+3 for Visa/Master, 15+3 for
            // Amex). The mask already trims; this is a belt-and-suspenders
            // gate against paste of a longer string.
            maxLength={19}
            className={fieldCls(!!errors.number)}
          />
        </Field>

        <Field label="nome impresso no cartão" error={errors.holderName}>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value.toUpperCase())}
            placeholder="MARINA V SOUSA"
            autoComplete="cc-name"
            className={fieldCls(!!errors.holderName)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="validade" error={errors.expiry}>
            <input
              value={expiry}
              onChange={(e) => setExpiry(maskExpiry(e.target.value))}
              placeholder="mm/aa"
              inputMode="numeric"
              autoComplete="cc-exp"
              className={fieldCls(!!errors.expiry)}
            />
          </Field>
          <Field label="cvv" error={errors.ccv}>
            <input
              value={ccv}
              onChange={(e) =>
                setCcv(digitsOnly(e.target.value).slice(0, 4))
              }
              placeholder="123"
              inputMode="numeric"
              autoComplete="cc-csc"
              className={fieldCls(!!errors.ccv)}
            />
          </Field>
          <Field label="cpf do titular" error={errors.cpf}>
            <input
              value={prefilled.cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className={fieldCls(!!errors.cpf)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]">
          <Field label="cep" error={errors.cep}>
            <input
              value={cep}
              onChange={(e) => setCep(maskCep(e.target.value))}
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
              className={fieldCls(!!errors.cep)}
            />
          </Field>
          <Field label="número" error={errors.addressNumber}>
            <input
              value={addressNumber}
              onChange={(e) => setAddressNumber(e.target.value.slice(0, 12))}
              placeholder="100"
              inputMode="numeric"
              className={fieldCls(!!errors.addressNumber)}
            />
          </Field>
          <Field label="complemento (opcional)">
            <input
              value={addressComplement}
              onChange={(e) =>
                setAddressComplement(e.target.value.slice(0, 100))
              }
              placeholder="apto 302"
              className={fieldCls(false)}
            />
          </Field>
        </div>

        <Field label="telefone do titular" error={errors.phone}>
          <input
            value={prefilled.phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(47) 99999-0000"
            inputMode="numeric"
            autoComplete="tel"
            className={fieldCls(!!errors.phone)}
          />
        </Field>

        <Field
          label="parcelas"
          hint="sem juros até 3x • a partir de 4x, 2,99% a.m. (máximo 6x)"
        >
          <div className="flex flex-col gap-2">
            <select
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Number(e.target.value))}
              disabled={isDebit}
              className={fieldCls(false)}
            >
              {Array.from({ length: installmentMax }, (_, i) => i + 1).map(
                (n) => {
                  const isNoInterest = n <= 3;
                  const interestLabel = isNoInterest ? 'sem juros' : '2,99% a.m.';
                  const financedForThisInstallment = computeFinancedTotalCents(
                    amountCents,
                    n,
                  );
                  const perInstallmentForThis =
                    financedForThisInstallment / 100 / n;
                  return (
                    <option key={n} value={n}>
                      {n === 1
                        ? `à vista — R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`
                        : `${n}x de R$ ${perInstallmentForThis
                            .toFixed(2)
                            .replace('.', ',')} (${interestLabel})`}
                    </option>
                  );
                }
              )}
            </select>
            <div className="rounded-lg bg-sand/30 px-3 py-2 text-[12px] font-medium text-ink">
              {(() => {
                const totalForSelected = computeFinancedTotalCents(
                  amountCents,
                  effectiveInstallments,
                );
                const totalForSelectedFormatted = (totalForSelected / 100)
                  .toFixed(2)
                  .replace('.', ',');
                const perInstallmentForSelected =
                  totalForSelected / 100 / effectiveInstallments;
                const interestForSelected = totalForSelected - amountCents;

                return effectiveInstallments === 1
                  ? `Pagamento à vista: R$ ${totalForSelectedFormatted}`
                  : `${effectiveInstallments}x de R$ ${perInstallmentForSelected
                      .toFixed(2)
                      .replace('.', ',')} • Total: R$ ${totalForSelectedFormatted}${
                      interestForSelected > 0
                        ? ` (+R$ ${(interestForSelected / 100)
                            .toFixed(2)
                            .replace('.', ',')} juros)`
                        : ''
                    }`;
              })()}
            </div>
          </div>
        </Field>


        {errors.top && (
          <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
            {errors.top}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-2 self-start rounded-full bg-clay px-7 py-4 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? 'validando com a asaas…'
            : `pagar R$ ${total} →`}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] font-semibold text-clay-d">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-ink-2 opacity-80">{hint}</span>
      ) : null}
    </label>
  );
}

function fieldCls(hasError: boolean): string {
  return [
    'rounded-xl border-[1.5px] bg-cream px-3.5 py-3 text-sm outline-none transition-colors',
    hasError
      ? 'border-clay-d focus:border-clay-d'
      : 'border-sand focus:border-ink',
  ].join(' ');
}

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { code?: string; message?: string | string[] }
      | undefined;
    if (data?.code === 'CARD_DECLINED' && typeof data.message === 'string') {
      return data.message;
    }
    if (data?.code === 'DUPLICATE_CHARGE') {
      return 'Já recebemos uma cobrança igual há pouco. Confira "meus pagamentos" antes de tentar de novo.';
    }
    if (data?.code === 'PAYMENT_PROVIDER_UNAVAILABLE') {
      return 'Não conseguimos falar com o Asaas agora. Nada foi cobrado — tenta de novo em instantes.';
    }
    if (Array.isArray(data?.message)) return data!.message!.join(' · ');
    if (typeof data?.message === 'string') return data!.message!;
  }
  return 'Algo deu errado. Tenta de novo em alguns segundos.';
}
