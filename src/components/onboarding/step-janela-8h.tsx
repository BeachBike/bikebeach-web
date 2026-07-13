/// Step 3 — the 8h cancellation window.
///
/// Design (2026-07, v3): a real clock whose hand **spins continuously**. The
/// dial is split in two colors (green = safe half, red = late half); as the
/// hand sweeps into each half, the caption below swaps to match. The hand
/// rotation and the caption cross-fade run on the *same* duration and switch
/// at the exact half-cycle, so the moving hand and the words always agree —
/// fixing both the earlier "just blinks" (no rotation) and "colors don't
/// match the text" problems. The caption lives BELOW the dial so the spinning
/// hand never crosses the words.
///
/// Accessibility: everyday wording, big captions, one idea at a time. The
/// dial is decorative (`aria-hidden`); the rule is fully in the text.
export function StepJanela8h() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          cancele com folga.
        </div>
        <p className="mt-2 max-w-[340px] text-[15px] leading-snug text-ink-2">
          Desmarcou com <b>mais de 8 horas</b> de antecedência? O crédito volta
          pra você. Deixou pra <b>última hora</b> (menos de 8h)? Aí o crédito é
          usado.
        </p>
      </div>

      {/* Spinning dial */}
      <div className="relative h-[180px] w-[180px]" aria-hidden>
        {/* Two-color ring: right half green (safe), left half red (late). */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, var(--color-sea) 0deg 180deg, var(--color-clay-d) 180deg 360deg)',
            mask: 'radial-gradient(circle, transparent 58px, black 59px)',
            WebkitMask:
              'radial-gradient(circle, transparent 58px, black 59px)',
          }}
        />
        {/* Inner face */}
        <div className="absolute inset-[24px] grid place-items-center rounded-full bg-cream">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-2">
            8h
          </span>
        </div>

        {/* Continuously rotating hand. */}
        <div
          className="absolute inset-0"
          style={{ animation: 'tour-clock-sweep 6s linear infinite' }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-ink"
            style={{
              width: 4,
              height: 62,
              marginLeft: -2,
              marginTop: -62,
              transformOrigin: 'bottom center',
            }}
          />
        </div>
        {/* Center hub */}
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
      </div>

      {/* Caption below the dial — swaps in sync with the hand's half. Both
          messages occupy the same spot; only one is visible at a time. */}
      <div className="relative h-[52px] w-full max-w-[300px]">
        <Caption
          keyframe="tour-clock-safe"
          tone="var(--color-sea)"
          icon="✓"
          headline="crédito volta"
          sub="cancelou com + de 8h"
        />
        <Caption
          keyframe="tour-clock-danger"
          tone="var(--color-clay-d)"
          icon="✕"
          headline="crédito é usado"
          sub="cancelou com − de 8h"
        />
      </div>

      <p className="max-w-[340px] text-center text-[13px] leading-snug text-ink-2">
        Entrou pela <b>lista de espera</b>? Aí você tem até <b>2 horas antes</b>{' '}
        pra cancelar sem perder nada.
      </p>
    </div>
  );
}

function Caption({
  keyframe,
  tone,
  icon,
  headline,
  sub,
}: {
  keyframe: string;
  tone: string;
  icon: string;
  headline: string;
  sub: string;
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center gap-2.5"
      style={{ animation: `${keyframe} 6s linear infinite` }}
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[16px] font-bold text-cream"
        style={{ background: tone }}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <div
          className="text-[15px] font-bold uppercase tracking-wide"
          style={{ color: tone }}
        >
          {headline}
        </div>
        <div className="font-mono text-[11px] text-ink-2">{sub}</div>
      </div>
    </div>
  );
}
