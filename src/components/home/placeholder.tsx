import type { CSSProperties } from 'react';

type Tone = 'clay' | 'sun' | 'sea' | 'sand' | 'cream' | 'ink';

const TONES: Record<Tone, { bg: string; stripe: string; fg: string }> = {
  clay: { bg: '#D85D34', stripe: '#C2532E', fg: '#F6EFE2' },
  sun: { bg: '#F2A65A', stripe: '#E69648', fg: '#221C16' },
  sea: { bg: '#2D6A6A', stripe: '#235757', fg: '#F6EFE2' },
  sand: { bg: '#DCC9A1', stripe: '#CDB888', fg: '#221C16' },
  cream: { bg: '#ECE2CD', stripe: '#DBCFB6', fg: '#221C16' },
  ink: { bg: '#221C16', stripe: '#2C251D', fg: '#F6EFE2' },
};

interface Props {
  label: string;
  ratio?: string;
  tone?: Tone;
  style?: CSSProperties;
}

/// Striped colored block used in place of real photos. Same visual treatment
/// as the prototype's `Ph` component. Replace with real `<img>` once we have
/// shooting day done.
export function Placeholder({
  label,
  ratio = '4/5',
  tone = 'clay',
  style,
}: Props) {
  const t = TONES[tone];
  return (
    <div
      style={{
        aspectRatio: ratio,
        width: '100%',
        background: `repeating-linear-gradient(115deg, ${t.bg} 0 28px, ${t.stripe} 28px 56px)`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 22,
        color: t.fg,
        borderRadius: 14,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 14,
          border: `1px dashed ${t.fg}`,
          opacity: 0.3,
          borderRadius: 4,
        }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          opacity: 0.9,
          position: 'relative',
          zIndex: 2,
        }}
      >
        ↳ {label}
      </div>
    </div>
  );
}
