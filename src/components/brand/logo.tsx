/// Brand mark — terracotta circle with cream wave + chainring dot.
/// Matches the prototype's `<Logo/>` component pixel-for-pixel.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-[9px] ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="var(--color-clay)" />
        <path
          d="M5 22 Q11 17 16 22 T27 22"
          stroke="var(--color-cream)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="16" cy="13" r="2.4" fill="var(--color-cream)" />
      </svg>
      <span className="display-tight text-2xl leading-none">bikebeach</span>
    </span>
  );
}
