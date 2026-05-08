import { useId, useMemo, useState, type ReactNode } from 'react';
import { initials } from '@/lib/format';

/// Tones used for the avatar background. Picked deterministically from the
/// userId so the same friend always keeps the same color across sessions.
const TONES = [
  { bg: 'var(--color-clay)', fg: 'var(--color-cream)' },
  { bg: 'var(--color-sea)', fg: 'var(--color-cream)' },
  { bg: 'var(--color-sun)', fg: 'var(--color-ink)' },
  { bg: 'var(--color-ink)', fg: 'var(--color-cream)' },
  { bg: '#3F7A4F', fg: 'var(--color-cream)' }, // GREEN
  { bg: 'var(--color-sand-2, #BBA683)', fg: 'var(--color-ink)' },
] as const;

function hashToTone(seed: string): (typeof TONES)[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return TONES[Math.abs(h) % TONES.length]!;
}

export type BubbleSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<BubbleSize, number> = {
  sm: 24,
  md: 28,
  lg: 36,
};

interface FriendBubbleProps {
  userId: string;
  name: string;
  size?: BubbleSize;
  /// Optional ring (used when stacking on a colored background — gives
  /// each bubble a 2px border in the parent's color so they stay legible
  /// when overlapping).
  ringColor?: string;
  /// Render as `<button>` for accessible click targets when wrapped in
  /// a stack with hover info; defaults to `<span>` when no onClick.
  onClick?: () => void;
  title?: string;
  isWaitlisted?: boolean;
}

/// Circular avatar with initials, deterministic per-user color, optional
/// outline ring + waitlist dotted overlay.
export function FriendBubble({
  userId,
  name,
  size = 'md',
  ringColor,
  onClick,
  title,
  isWaitlisted,
}: FriendBubbleProps) {
  const tone = hashToTone(userId);
  const px = SIZE_PX[size];
  const fontSize = Math.round(px * 0.42);
  const Element = onClick ? 'button' : 'span';

  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title ?? name}
      aria-label={title ?? `Amigo ${name}`}
      className={`relative inline-grid place-items-center rounded-full font-bold leading-none transition-transform ${
        onClick ? 'cursor-pointer hover:scale-110' : ''
      }`}
      style={{
        width: px,
        height: px,
        background: tone.bg,
        color: tone.fg,
        fontSize,
        boxShadow: ringColor ? `0 0 0 2px ${ringColor}` : undefined,
        border: isWaitlisted ? '1.5px dashed currentColor' : undefined,
      }}
    >
      {initials(name) || '··'}
    </Element>
  );
}

interface FriendBubbleStackProps {
  friends: Array<{ userId: string; name: string; isWaitlisted?: boolean }>;
  /// Maximum bubbles to render before collapsing into "+N". Default 3.
  max?: number;
  size?: BubbleSize;
  /// Background color of the parent — gets baked into each bubble's ring
  /// so overlapping bubbles read as separate rings instead of blobs.
  ringColor?: string;
  /// Called when the user taps the "+N" overflow chip; pass to open a
  /// modal listing every attendee.
  onOverflowClick?: () => void;
  /// Optional label rendered to the left of the stack (e.g. "amigos").
  label?: ReactNode;
}

/// Up to `max` `<FriendBubble>` overlapping by ~10px, plus a "+N" chip
/// when there are more. Stack order matches the array (first = front).
export function FriendBubbleStack({
  friends,
  max = 3,
  size = 'md',
  ringColor = 'var(--color-cream)',
  onOverflowClick,
  label,
}: FriendBubbleStackProps) {
  if (friends.length === 0) return null;
  const visible = friends.slice(0, max);
  const overflow = friends.length - visible.length;
  const px = SIZE_PX[size];
  const overlap = Math.round(px * 0.36);

  return (
    <div className="inline-flex items-center gap-2">
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
          {label}
        </span>
      )}
      <div className="inline-flex">
        {visible.map((f, i) => (
          <span
            key={f.userId}
            className="inline-block"
            style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: 10 - i }}
          >
            <FriendBubble
              userId={f.userId}
              name={f.name}
              size={size}
              ringColor={ringColor}
              isWaitlisted={f.isWaitlisted}
            />
          </span>
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={onOverflowClick}
            className="inline-grid cursor-pointer place-items-center rounded-full bg-cream-2 font-bold text-ink transition-colors hover:bg-sand"
            style={{
              width: px,
              height: px,
              fontSize: Math.round(px * 0.36),
              marginLeft: -overlap,
              zIndex: 1,
              boxShadow: `0 0 0 2px ${ringColor}`,
            }}
            aria-label={`+${overflow} amigos`}
          >
            +{overflow}
          </button>
        )}
      </div>
    </div>
  );
}

interface FriendsListModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  friends: Array<{ userId: string; name: string; isWaitlisted?: boolean }>;
}

/// Modal listing every friend in a class — shown when the user taps the
/// "+N" overflow chip on the stack.
export function FriendsListModal({
  open,
  onClose,
  title = 'amigos nessa aula',
  friends,
}: FriendsListModalProps) {
  const titleId = useId();
  const [search] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, search]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[800] flex items-center justify-center bg-ink/45 px-6 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-3xl bg-cream p-6 shadow-2xl"
      >
        <div id={titleId} className="display-tight text-[24px] leading-tight">
          {title}
        </div>
        <ul className="mt-4 flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="rounded-xl bg-cream-2 px-4 py-6 text-center text-sm text-ink-2">
              ninguém ainda.
            </li>
          ) : (
            filtered.map((f) => (
              <li
                key={f.userId}
                className="flex items-center gap-3 rounded-2xl border border-sand bg-cream px-3 py-2.5"
              >
                <FriendBubble userId={f.userId} name={f.name} size="lg" />
                <span className="text-sm font-semibold lowercase">
                  {f.name}
                </span>
                {f.isWaitlisted && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-ink-2">
                    na fila
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-ink py-3 text-sm font-semibold text-cream"
        >
          fechar
        </button>
      </div>
    </div>
  );
}
