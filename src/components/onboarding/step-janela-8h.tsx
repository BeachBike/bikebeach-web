/// Step 2 — the 8h cancellation window, visualized as a clock whose hand
/// sweeps. The flag swaps between "safe / credit returns" and "danger /
/// credit lost" so the rule is shown twice per cycle.
///
/// Why: the 8h window is the most common gotcha — users only learn it
/// the hard way (cancel late, lose a credit) without this.
export function StepJanela8h() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          cancela antes de 8h.
        </div>
        <p className="mt-2 max-w-[340px] text-sm text-ink-2">
          Cancelou com mais de <b>8 horas</b> de antecedência? Crédito volta
          pro seu pacote. Cancelou em cima da hora? <b>Perde o crédito</b>.
        </p>
      </div>

      <div className="relative grid h-[200px] w-[200px] place-items-center">
        {/* Anel */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from -90deg, var(--color-sea) 0deg 120deg, var(--color-clay-d) 120deg 360deg)',
            mask: 'radial-gradient(circle, transparent 64px, black 65px)',
            WebkitMask:
              'radial-gradient(circle, transparent 64px, black 65px)',
          }}
        />
        {/* Mostrador interno */}
        <div className="grid h-[140px] w-[140px] place-items-center rounded-full bg-cream">
          {/* Bandeira "seguro" (visible 0-50% of cycle) */}
          <div
            className="absolute flex flex-col items-center gap-1"
            style={{
              animation: 'tour-flag-safe 4s ease-in-out infinite',
            }}
          >
            <span className="text-3xl" aria-hidden>
              ✓
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-sea-d">
              crédito volta
            </span>
            <span className="font-mono text-[10px] text-ink-2">+8h antes</span>
          </div>
          {/* Bandeira "perdeu" (visible 50-100% of cycle) */}
          <div
            className="absolute flex flex-col items-center gap-1"
            style={{
              animation: 'tour-flag-danger 4s ease-in-out infinite',
            }}
          >
            <span className="text-3xl" aria-hidden>
              ✕
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-clay-d">
              perde crédito
            </span>
            <span className="font-mono text-[10px] text-ink-2">−8h antes</span>
          </div>
        </div>
        {/* Ponteiro */}
        <div
          className="pointer-events-none absolute inset-0 origin-center"
          style={{
            animation: 'tour-clock-sweep 4s linear infinite',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          />
          <div
            className="absolute left-1/2 top-[14px] h-[88px] w-[3px] -translate-x-1/2 rounded-full bg-ink"
          />
        </div>
      </div>

      <p className="text-center text-[12px] text-ink-2">
        Bônus: se você foi <b>promovido da lista de espera</b>, ganha
        cancelamento livre até <b>2h antes</b>.
      </p>
    </div>
  );
}
