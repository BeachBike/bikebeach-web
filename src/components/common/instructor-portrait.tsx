import { useMemo } from 'react';
import { assetUrl } from '@/api/client';

type Tone = 'clay' | 'sun' | 'sea' | 'sand' | 'ink' | 'green';
type Size = 'xs' | 'sm' | 'lg2' | 'md' | 'lg';

const SIZE: Record<Size, { box: string; ratio: string; nameSize: number }> = {
  xs: { box: '40px', ratio: '1', nameSize: 0 },
  sm: { box: '64px', ratio: '1', nameSize: 0 },
  /// Large circular variant — used by the arena "palco" card where the
  /// instructor photo is the visual anchor. Stays a circle (ratio 1), so
  /// it counts as compact for object-fit / radius purposes.
  lg2: { box: '104px', ratio: '1', nameSize: 0 },
  md: { box: '160px', ratio: '4/5', nameSize: 0 },
  lg: { box: '100%', ratio: '4/5', nameSize: 0 },
};

const TONE_GRADIENT: Record<Tone, { from: string; to: string; accent: string }> = {
  clay: { from: '#F2A65A', to: '#D85D34', accent: '#FCEAD2' },
  sun: { from: '#FCD79B', to: '#F2A65A', accent: '#221C16' },
  sea: { from: '#5FA29F', to: '#2D6A6A', accent: '#F6EFE2' },
  sand: { from: '#ECDDB6', to: '#CDB888', accent: '#221C16' },
  ink: { from: '#5C4D3D', to: '#221C16', accent: '#F2A65A' },
  // GREEN class-kind token — base is var(--color-success) #3F7A4F.
  // Built like `sea` (light → darker shade) so it reads as a real green
  // instead of falling back to teal. Cream accent for legible initials.
  green: { from: '#6FAE82', to: '#2F5F3C', accent: '#F6EFE2' },
};

interface Props {
  /// Relative path returned by the API (`/uploads/instructors/<id>.png?v=…`).
  /// Null → renders the deterministic fallback (initials over a tinted blob).
  photoUrl: string | null | undefined;
  name: string;
  /// Visual tone for the gradient background. Usually derived from the
  /// instructor's primary class kind colorToken.
  tone?: Tone;
  size: Size;
  className?: string;
}

/// Standardized instructor portrait — the photo (transparent PNG, produced by
/// `@imgly/background-removal` at upload time) sits in front of a gradient
/// blob so every instructor card has the same visual rhythm regardless of
/// the input photo. When there's no photo yet we render initials inside the
/// same blob so the layout doesn't shift.
export function InstructorPortrait({
  photoUrl,
  name,
  tone = 'clay',
  size,
  className = '',
}: Props) {
  const dims = SIZE[size];
  const palette = TONE_GRADIENT[tone];
  const resolved = assetUrl(photoUrl ?? null);
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'BB';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }, [name]);
  const isCompact = size === 'xs' || size === 'sm' || size === 'lg2';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: dims.box,
        aspectRatio: dims.ratio,
        borderRadius: isCompact ? '999px' : '18px',
        background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
    >
      {/* Sun arc — large soft circle behind the head */}
      <div
        aria-hidden
        className="absolute"
        style={{
          width: '70%',
          aspectRatio: '1',
          left: '15%',
          top: '12%',
          borderRadius: '999px',
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%)`,
          mixBlendMode: 'soft-light',
        }}
      />
      {/* Sand strip — only on tall portraits */}
      {!isCompact && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0"
          style={{
            height: '22%',
            background:
              'linear-gradient(180deg, rgba(34,28,22,0) 0%, rgba(34,28,22,0.18) 100%)',
          }}
        />
      )}

      {resolved ? (
        <img
          src={resolved}
          alt={name}
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: isCompact ? 'cover' : 'contain',
            objectPosition: 'bottom center',
            // Drop shadow under the cutout face so it doesn't look pasted.
            filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.18))',
          }}
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center font-extrabold"
          style={{
            color: palette.accent,
            fontSize:
              size === 'xs'
                ? 14
                : size === 'sm'
                  ? 22
                  : size === 'lg2'
                    ? 38
                    : size === 'md'
                      ? 48
                      : 96,
            letterSpacing: '-0.04em',
          }}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </div>
  );
}

/// Tiny helper that maps a backend `colorToken` to one of the local tones.
/// Centralised so consumers don't keep re-declaring the same map.
export function toneFromColorToken(
  ct: 'CLAY' | 'SUN' | 'SEA' | 'SAND' | 'INK' | 'GREEN' | null | undefined,
): Tone {
  switch (ct) {
    case 'SUN':
      return 'sun';
    case 'SEA':
      return 'sea';
    case 'GREEN':
      return 'green';
    case 'SAND':
      return 'sand';
    case 'INK':
      return 'ink';
    case 'CLAY':
    default:
      return 'clay';
  }
}
