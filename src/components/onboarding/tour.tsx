import { useEffect, useRef, useState } from 'react';
import { useMarkOnboardingSeen } from '@/api/me';
import { StepCreditos } from './step-creditos';
import { StepFila } from './step-fila';
import { StepJanela8h } from './step-janela-8h';
import { StepReservarBike } from './step-reservar-bike';

interface Props {
  open: boolean;
  /// Called after the tour closes (skip or finish). Parent decides whether
  /// to render the tour again. Idempotent — calling the backend twice is
  /// a no-op.
  onClose: () => void;
}

const STEPS = [
  { id: 'reservar', Comp: StepReservarBike, cta: 'próximo' },
  { id: 'janela', Comp: StepJanela8h, cta: 'próximo' },
  { id: 'fila', Comp: StepFila, cta: 'próximo' },
  { id: 'creditos', Comp: StepCreditos, cta: 'começar a usar →' },
] as const;

/// Fullscreen onboarding tour. 4 animated steps that explain the
/// non-obvious parts of bikebeach: the bike map, the 8h cancel window,
/// auto-promoted waitlist, and credit expiration. Built mobile-first with
/// swipe navigation; on desktop the side arrows + keyboard arrows work too.
///
/// State: index 0..3 + a `direction` we feed to the step container so the
/// in/out slide reads correctly forward vs back. The current step is keyed
/// on its id so the animation in each step restarts from frame 0 on entry.
export function OnboardingTour({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const markSeen = useMarkOnboardingSeen();

  // Touch swipe — record start X on touchstart, decide on touchend.
  const touchStartX = useRef<number | null>(null);

  // Reset to first step whenever the tour reopens — "rever tour" should
  // always start from the beginning.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Keyboard nav on desktop (Escape closes; arrows navigate).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  if (!open) return null;

  const finish = () => {
    markSeen.mutate();
    onClose();
  };

  const goNext = () => {
    if (index === STEPS.length - 1) {
      finish();
      return;
    }
    setDirection(1);
    setIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((i) => i - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    const THRESH = 48; // px — discount accidental drags
    if (dx <= -THRESH) goNext();
    else if (dx >= THRESH) goPrev();
    touchStartX.current = null;
  };

  const { Comp, cta } = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div
      // Fullscreen, on top of everything. Cream bg matches the rest of the
      // app so the tour reads as part of bikebeach, not a generic overlay.
      className="fixed inset-0 z-[120] flex flex-col bg-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Tour bikebeach"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
          tour bikebeach
        </div>
        <button
          type="button"
          onClick={finish}
          className="rounded-full bg-cream-2 px-4 py-2 text-xs font-semibold text-ink-2 transition-colors hover:bg-sand"
        >
          pular
        </button>
      </header>

      {/* Step body — flex-1 so it absorbs the viewport. Re-mounts on `index`
          change so each step's CSS animation restarts. */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5">
        <div
          key={STEPS[index].id}
          className="w-full max-w-[440px]"
          style={{
            animation: `${direction === 1 ? 'slidein' : 'fadein'} 0.4s cubic-bezier(0.2,0.7,0.2,1) both`,
          }}
        >
          <Comp />
        </div>
      </main>

      {/* Footer — dots + primary CTA + (mobile) back arrow */}
      <footer className="flex flex-col gap-4 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3">
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Passo ${i + 1}`}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={
                'h-2 rounded-full transition-all duration-300 ' +
                (i === index
                  ? 'w-8 bg-clay'
                  : 'w-2 bg-sand hover:bg-ink-2')
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-full border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink transition-opacity disabled:opacity-30"
          >
            ← voltar
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {cta}
          </button>
        </div>

        {!isLast && (
          <div className="text-center text-[10px] uppercase tracking-widest text-ink-2 opacity-60">
            ← arraste pros lados pra navegar →
          </div>
        )}
      </footer>
    </div>
  );
}
