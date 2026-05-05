interface Props {
  step: number; // 0..2
  hasAula: boolean;
  hasBike: boolean;
  onJump: (target: number) => void;
}

const LABELS = ['horário', 'bike', 'confirmação'] as const;

/// Tab strip showing the user's progress through the 3 steps. Earlier steps
/// are clickable to jump back; later ones lock until the prereq is met.
export function StepsBreadcrumb({ step, hasAula, hasBike, onJump }: Props) {
  const done = [hasAula, hasBike, false];
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-1.5 pt-5 text-xs text-ink-2">
      {LABELS.map((l, i) => {
        const active = i === step;
        const reachable = i <= step;
        const isDone = done[i] && i < step;
        return (
          <div key={l} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: active ? 'var(--color-ink)' : 'transparent',
                color: active
                  ? 'var(--color-cream)'
                  : reachable
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-2)',
                cursor: reachable ? 'pointer' : 'default',
              }}
            >
              <span
                className="mono"
                style={{ opacity: active ? 0.85 : 0.55 }}
              >
                0{i + 1}
              </span>
              {isDone ? '✓ ' : ''}
              {l}
            </button>
            {i < 2 && <span className="opacity-30">·</span>}
          </div>
        );
      })}
    </div>
  );
}
