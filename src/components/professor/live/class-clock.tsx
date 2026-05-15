/* eslint-disable react-refresh/only-export-components --
 * The `useClassClock` hook is consumed by sibling live-mode components
 * (action bar, attendance panel) so they share the same wall-clock state.
 * Co-locating with the visual `ClassClock` keeps the phase-state and the
 * presentation in one file — HMR cost is negligible. */
import { useEffect, useState } from 'react';
import { LATE_CHECKIN_TOLERANCE_MINUTES } from '@/lib/constants';

/// Adaptive clock for the AO VIVO professor screen. Four phases:
///
///   • PRE      — class hasn't started yet (countdown to startsAt)
///   • TOLERANCE — 0 → +tolerance minutes, late check-in still allowed
///   • LIVE     — between tolerance end and endsAt
///   • OVER     — past endsAt; "finalizar aula" is the right CTA now
///
/// The phase name + tone + big mm:ss live next to each other; the parent
/// uses the phase to decide which actions to surface.

export type ClassPhase = 'pre' | 'tolerance' | 'live' | 'over';

export interface ClockState {
  phase: ClassPhase;
  /// Milliseconds left in the CURRENT phase. Counts down to 0 then
  /// transitions to the next phase on the next tick.
  msInPhase: number;
  /// Wall-clock distance from startsAt; negative pre-start.
  msFromStart: number;
}

export function useClassClock(
  startsAtIso: string,
  durationMinutes: number,
): ClockState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // 1s tick — fine for a screen that's always foreground in the studio.
    // The clock dictates phase transitions, so a 5s cadence would let the
    // "tolerância acaba em 0:02" reading feel laggy.
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(startsAtIso).getTime();
  const toleranceEnd = start + LATE_CHECKIN_TOLERANCE_MINUTES * 60_000;
  const end = start + durationMinutes * 60_000;
  const msFromStart = now - start;

  if (now < start) {
    return { phase: 'pre', msInPhase: start - now, msFromStart };
  }
  if (now < toleranceEnd) {
    return {
      phase: 'tolerance',
      msInPhase: toleranceEnd - now,
      msFromStart,
    };
  }
  if (now < end) {
    return { phase: 'live', msInPhase: end - now, msFromStart };
  }
  return { phase: 'over', msInPhase: now - end, msFromStart };
}

/// Big clock + phase label, ready to drop into the live header.
export function ClassClock({
  startsAtIso,
  durationMinutes,
}: {
  startsAtIso: string;
  durationMinutes: number;
}) {
  const clock = useClassClock(startsAtIso, durationMinutes);
  const meta = phaseMeta(clock.phase);

  return (
    <div className="flex items-center gap-4">
      {/* Phase chip */}
      <div
        className="flex items-center gap-2 rounded-full px-3.5 py-1.5"
        style={{ background: meta.chipBg, color: meta.chipFg }}
      >
        <span
          className={
            clock.phase === 'live' || clock.phase === 'tolerance'
              ? 'bb-pulse size-2 rounded-full'
              : 'size-2 rounded-full'
          }
          style={{ background: meta.dotColor }}
        />
        <span className="text-[11px] font-bold uppercase tracking-[.12em]">
          {meta.label}
        </span>
      </div>

      {/* mm:ss */}
      <div>
        <div
          className="mono display-tight leading-none"
          style={{
            fontSize: 'clamp(40px, 6vw, 56px)',
            color: meta.timerFg,
          }}
        >
          {formatMs(clock.msInPhase)}
        </div>
        <div className="mt-1 text-[12px] text-ink-2">{meta.subtitle}</div>
      </div>
    </div>
  );
}

interface PhaseMeta {
  label: string;
  subtitle: string;
  chipBg: string;
  chipFg: string;
  dotColor: string;
  timerFg: string;
}

function phaseMeta(phase: ClassPhase): PhaseMeta {
  switch (phase) {
    case 'pre':
      return {
        label: 'antes de começar',
        subtitle: 'pra começar',
        chipBg: 'rgba(45,106,106,.12)',
        chipFg: 'var(--color-sea-d)',
        dotColor: 'var(--color-sea)',
        timerFg: 'var(--color-ink)',
      };
    case 'tolerance':
      return {
        label: 'tolerância de check-in',
        subtitle: 'pra fechar a tolerância · check-in ainda rola',
        chipBg: 'rgba(242,166,90,.18)',
        chipFg: 'var(--color-clay-d)',
        dotColor: 'var(--color-sun)',
        timerFg: 'var(--color-clay-d)',
      };
    case 'live':
      return {
        label: 'ao vivo',
        subtitle: 'pra terminar a aula',
        chipBg: 'rgba(216,93,52,.15)',
        chipFg: 'var(--color-clay-d)',
        dotColor: 'var(--color-clay)',
        timerFg: 'var(--color-clay)',
      };
    case 'over':
      return {
        label: 'tempo encerrado',
        subtitle: 'desde o fim — toca finalizar quando quiser',
        chipBg: 'rgba(110,97,79,.18)',
        chipFg: 'var(--color-ink-2)',
        dotColor: 'var(--color-ink-3)',
        timerFg: 'var(--color-ink-2)',
      };
  }
}

/// mm:ss for under-1h, h:mm:ss above. Always positive — the phase carries
/// the direction (countdown vs count-up).
function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
