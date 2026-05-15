import { useEffectiveArena } from '@/api/public';

/// Infinite-scrolling perks bar. The "1ª aula R$ 1" promo from the original
/// prototype was dropped per the 2026-05-04 backend gap-resolution call (no
/// PromoCode model in MVP) — replaced with backend-grounded perks. The bike
/// count is live from the effective arena (driven by the global picker) so
/// it stays accurate as the admin adds/retires bikes.
export function Marquee() {
  const { unit } = useEffectiveArena();
  const bikeCount = unit?.operationalBikeCount;

  const bikePerk = bikeCount
    ? `${bikeCount} bikes por turma`
    : 'Frota completa por turma';

  const items = [
    bikePerk,
    'Pé na areia, sem calçado',
    'Cancele aulas até 8h antes',
    'Pix com 5% de desconto',
    'Sem fidelidade',
  ];
  const loop = [...items, ...items];

  return (
    <section className="overflow-hidden bg-ink py-6 text-cream">
      <div className="bb-marquee flex items-center gap-12 whitespace-nowrap will-change-transform">
        {loop.map((it, i) => (
          <span
            key={i}
            className="display flex items-center gap-12 text-2xl font-medium text-cream"
          >
            {it}
            <span className="text-lg text-clay">☼</span>
          </span>
        ))}
      </div>
    </section>
  );
}
