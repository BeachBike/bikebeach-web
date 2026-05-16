import type { CreditPack } from '@/api/me';
import type { PublicBike, SeatMap } from '@/api/public';
import {
  firstName,
  formatDayMonth,
  formatHourMinute,
  intensityLabel,
} from '@/lib/format';

interface Props {
  seatMap: SeatMap;
  bike: PublicBike;
  packs: CreditPack[] | undefined;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  /// Edit-bike mode: confirm button calls PATCH /bike instead of POST.
  /// We hide the credit-cost block (no extra credit consumed) and swap
  /// the CTA copy.
  editMode?: boolean;
}

const RULES = [
  'chega 10 min antes — areia perde o sapato',
  'leva squeeze cheio. sol e vento desidratam',
  'cancela sem custo até 8h antes',
  'se chover, crédito volta automático',
  'depois do horário, vaga vai pra espera',
] as const;

export function StepConfirm({
  seatMap,
  bike,
  packs,
  isSubmitting,
  errorMessage,
  onConfirm,
  editMode,
}: Props) {
  const slot = seatMap.slot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);
  const profFirstName = firstName(slot.instructor.name);
  // E3 — prefer the canonical row/col fields (B3) over parsing the label.
  // Bikes seeded before B3 may have row/col null; fall back to the label
  // and a regex-extracted row to keep the legacy seed visible.
  const labelMatch = /^([A-Z])[-_]?(\d+)/.exec(bike.label.trim());
  const rowLetter =
    bike.row ?? labelMatch?.[1] ?? bike.label.split('-')[0] ?? '–';
  const colNumber =
    bike.col != null
      ? String(bike.col).padStart(2, '0')
      : (labelMatch?.[2] ?? bike.label);

  // Pick the credit pack that's about to be consumed (smallest expiry that
  // still has credits) to mirror the backend's selection logic.
  const now = new Date();
  const consumablePacks = (packs ?? []).filter(
    (p) =>
      p.remainingCredits > 0 &&
      (!p.expiresAt || new Date(p.expiresAt) > now),
  );
  const target =
    [...consumablePacks].sort((a, b) => {
      const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return ax - bx;
    })[0] ?? null;
  const remainingAfter = target ? target.remainingCredits - 1 : 0;
  const targetLabel = target
    ? target.source === 'SUBSCRIPTION_CYCLE'
      ? 'do plano mensal'
      : `do pacote ${target.totalCredits}`
    : 'sem pacote ativo';
  const hasMultipleConsumablePacks = consumablePacks.length > 1;
  const targetExpiry = target?.expiresAt
    ? formatDayMonth(target.expiresAt)
    : null;

  return (
    <div className="fadeup">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        passo três · de três
      </div>
      <h2
        className="display-tight mt-3"
        style={{ fontSize: 'clamp(28px,6vw,72px)', lineHeight: 0.92 }}
      >
        {editMode ? (
          <>
            confirma a<br />
            <span className="font-normal italic text-clay">troca de bike.</span>
          </>
        ) : (
          <>
            confirma e<br />
            <span className="font-normal italic text-clay">vem pedalar.</span>
          </>
        )}
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Resumo */}
        <div className="rounded-[20px] border-[1.5px] border-sand bg-cream p-7">
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            resumo
          </div>
          <div
            className="display-tight mt-3.5"
            style={{ fontSize: 'clamp(26px,5vw,36px)', lineHeight: 1 }}
          >
            {titulo}
          </div>
          <div className="mt-1.5 text-sm text-ink-2">
            com {profFirstName} · {slot.durationMinutes} min · pegada {intens}
          </div>

          <div className="mt-5 flex flex-col gap-3.5 border-t border-sand pt-5">
            {(
              [
                ['arena', slot.unit.name.toLowerCase()],
                ['dia', formatDayMonth(slot.startsAt)],
                ['hora', formatHourMinute(slot.startsAt)],
                ['bike', `${colNumber} · fila ${rowLetter}`],
              ] as const
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between"
              >
                <span className="text-[13px] lowercase text-ink-2">{k}</span>
                <span className="text-sm font-semibold">{v}</span>
              </div>
            ))}
          </div>

          {editMode ? (
            <div className="mt-5 rounded-xl bg-cream-2 px-4 py-4 text-[13px] leading-snug text-ink-2">
              <b className="text-ink">só a bike muda.</b> seu crédito segue
              consumido na reserva original — nada extra é cobrado.
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-cream-2 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-2">custo</span>
                <span className="display-tight" style={{ fontSize: 22 }}>
                  1 crédito
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[13px] text-ink-2">{targetLabel}</span>
                <span className="text-[13px] font-semibold">
                  {target ? (
                    <>
                      <span className="text-clay">{remainingAfter}</span>{' '}
                      restantes
                    </>
                  ) : (
                    <span className="text-clay-d">sem créditos</span>
                  )}
                </span>
              </div>
              {target && hasMultipleConsumablePacks && (
                <div className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-[12px] leading-snug text-clay-d">
                  Voce tem mais de um credito ativo. Esta reserva usa 1
                  credito {targetLabel}
                  {targetExpiry ? `, que vence em ${targetExpiry}` : ''}. A
                  regra e sempre consumir o credito que vence primeiro.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Regras */}
        <div className="relative overflow-hidden rounded-[20px] bg-ink p-7 text-cream">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-45"
            style={{
              background:
                'radial-gradient(circle, var(--color-sun), transparent 70%)',
            }}
          />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wide text-sun">
              regras da casa
            </div>
            <ul className="mt-5 flex list-none flex-col gap-3.5">
              {RULES.map((r) => (
                <li
                  key={r}
                  className="flex gap-3 text-sm leading-snug"
                >
                  <span className="flex-shrink-0 font-bold text-sun">☼</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-xl bg-clay-d/10 px-5 py-4 text-sm font-medium text-clay-d">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3.5">
        <span className="mr-auto text-[13px] text-ink-2">
          {editMode ? 'tudo certo? bora trocar.' : 'tudo certo? bora.'}
        </span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting || (!editMode && !target)}
          className="inline-flex items-center gap-3 rounded-full bg-clay px-9 py-5 text-base font-semibold text-cream shadow-[0_24px_50px_-16px_rgba(216,93,52,0.55)] transition-transform duration-200 hover:-translate-y-1 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? editMode
              ? 'trocando…'
              : 'reservando…'
            : editMode
              ? 'confirmar troca →'
              : !target
                ? 'sem créditos'
                : 'confirmar reserva →'}
        </button>
      </div>
    </div>
  );
}
