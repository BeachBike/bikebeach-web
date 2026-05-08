import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  type PublicPackOffer,
  type PublicPlan,
  useDefaultUnit,
  usePackOffers,
  usePlans,
} from '@/api/public';
import { PIX_DISCOUNT_PERCENT } from '@/lib/constants';
import { resolveDiscount, shortDate } from '@/lib/discount';
import { formatCents } from '@/lib/format';

interface CardData {
  key: string;
  kind: 'pack' | 'plan';
  /// Display heading (e.g. "Avulso", "Pacote 10", "Mensal Ilimitado").
  title: string;
  priceCents: number;
  /// Sub line under the price.
  sub: string;
  /// Bullet list inside the card.
  bullets: string[];
  /// Optional discount campaign (resolved already — null when not active).
  discount: { percent: number; discountedCents: number; endsAt: Date } | null;
  /// Where the CTA points.
  ctaHref: string;
  /// Visual tone — alternates so the row has rhythm.
  tone: 'cream' | 'clay' | 'ink';
  destaque?: boolean;
}

/// Deterministic 3-card row for the home (D2 / item 2):
///   1. Cheapest active pack
///   2. Cheapest active monthly plan, fallback to next active pack
///   3. Most expensive active pack (when distinct)
/// Falls back gracefully when fewer items are configured.
export function Planos() {
  const [ativo, setAtivo] = useState(1);
  const { unit } = useDefaultUnit();
  const { data: packsData } = usePackOffers(unit?.id);
  const { data: plansData } = usePlans();

  // 2026-05 — PIX discount is a system-wide constant (was per-arena
  // before). The legacy `unit.pixDiscountPercent` field has been removed.
  void unit; // unit fetch retained because other components still use it
  const pixDiscountPercent = PIX_DISCOUNT_PERCENT;

  const cards = useMemo<CardData[]>(() => {
    const packs = (packsData ?? []).filter((p) => p.isActive);
    const plans = (plansData ?? []).filter((p) => p.isActive);
    const sortedPacks = [...packs].sort((a, b) => a.priceCents - b.priceCents);
    const sortedPlans = [...plans].sort((a, b) => a.priceCents - b.priceCents);

    const cheapestPack = sortedPacks[0];
    const priciestPack = sortedPacks[sortedPacks.length - 1];
    const cheapestPlan = sortedPlans[0];

    const out: CardData[] = [];
    const usedPackIds = new Set<string>();

    if (cheapestPack) {
      out.push(packCard(cheapestPack, pixDiscountPercent, 'cream'));
      usedPackIds.add(cheapestPack.id);
    }

    // Slot 2 = cheapest monthly when present (highlighted middle slot so the
    // row reads cheapest-pack · monthly · pack-maior).
    if (cheapestPlan) {
      out.push(planCard(cheapestPlan, 'clay', true));
    }

    if (priciestPack && !usedPackIds.has(priciestPack.id)) {
      out.push(packCard(priciestPack, pixDiscountPercent, 'ink'));
      usedPackIds.add(priciestPack.id);
    }

    // No monthly? Fill with another pack between cheapest and priciest.
    if (!cheapestPlan) {
      const fallback = sortedPacks.find((p) => !usedPackIds.has(p.id));
      if (fallback) {
        out.push(packCard(fallback, pixDiscountPercent, 'clay', true));
        usedPackIds.add(fallback.id);
      }
    }

    // Final pass — keep filling up to 3 with any remaining packs.
    for (const p of sortedPacks) {
      if (out.length >= 3) break;
      if (usedPackIds.has(p.id)) continue;
      out.push(packCard(p, pixDiscountPercent, 'cream'));
      usedPackIds.add(p.id);
    }

    return out.slice(0, 3);
  }, [packsData, plansData, pixDiscountPercent]);

  return (
    <section id="planos" className="px-7 pb-[120px] pt-[140px]">
      <h2
        className="display-tight max-w-[1300px]"
        style={{ fontSize: 'clamp(56px,9vw,140px)', lineHeight: 0.92 }}
      >
        Pague <span className="font-normal italic text-clay">como</span>{' '}
        quiser.
        <br />
        Pedale <span className="font-normal italic">quando</span> quiser.
      </h2>
      <p className="mt-6 max-w-[520px] text-[17px] text-ink-2">
        Aceitamos Pix, crédito e débito. Sem fidelidade, sem letrinha miúda.
      </p>

      {cards.length === 0 ? (
        <div className="mt-10 rounded-[18px] border border-dashed border-sand-2 bg-cream-2 px-6 py-10 text-center text-sm text-ink-2">
          Catálogo em ajuste — nossos planos voltam em instantes.
        </div>
      ) : (
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {cards.map((card, i) => {
            const on = ativo === i;
            const isClay = card.tone === 'clay';
            const isInk = card.tone === 'ink';
            const bg = isClay
              ? 'var(--color-clay)'
              : isInk
                ? 'var(--color-ink)'
                : 'var(--color-cream-2)';
            const fg =
              isClay || isInk ? 'var(--color-cream)' : 'var(--color-ink)';
            const accent = isClay
              ? 'var(--color-cream)'
              : isInk
                ? 'var(--color-sun)'
                : 'var(--color-clay)';
            return (
              <div
                key={card.key}
                onMouseEnter={() => setAtivo(i)}
                className="relative flex min-h-[520px] cursor-pointer flex-col rounded-[22px] p-8 pt-9 transition-all duration-300 ease-out"
                style={{
                  background: bg,
                  color: fg,
                  transform: on ? 'translateY(-8px)' : 'none',
                  boxShadow: on
                    ? '0 30px 60px -28px rgba(34,28,22,.45)'
                    : 'none',
                }}
              >
                {card.destaque && (
                  <span
                    className="absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: 'var(--color-ink)',
                      color: 'var(--color-cream)',
                    }}
                  >
                    + pedido
                  </span>
                )}
                <div
                  className="display-tight"
                  style={{ fontSize: 34, lineHeight: 1 }}
                >
                  {card.title}
                </div>

                {card.discount && (
                  <span
                    className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{
                      background:
                        isClay || isInk
                          ? 'rgba(246,239,226,0.18)'
                          : 'var(--color-clay)',
                      color: 'var(--color-cream)',
                    }}
                  >
                    −{card.discount.percent}% até {shortDate(card.discount.endsAt)}
                  </span>
                )}

                <div className="mt-7 flex items-start gap-1.5">
                  <span className="mt-3.5 text-2xl font-semibold">R$</span>
                  <span
                    className="display font-medium"
                    style={{ fontSize: 96, lineHeight: 0.9 }}
                  >
                    {formatCents(
                      card.discount?.discountedCents ?? card.priceCents,
                    )
                      .replace('R$', '')
                      .trim()}
                  </span>
                </div>
                {card.discount && (
                  <div className="mt-1 text-[13px] opacity-70 line-through">
                    de {formatCents(card.priceCents)}
                  </div>
                )}
                <div className="mt-1.5 text-sm font-medium opacity-85">
                  {card.sub}
                </div>

                <ul className="mt-7 flex flex-1 flex-col gap-3.5 list-none">
                  {card.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 text-[15px] leading-snug"
                    >
                      <span
                        className="font-bold"
                        style={{ color: accent }}
                        aria-hidden
                      >
                        ✺
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to={card.ctaHref}
                  className="mt-6 rounded-full py-4 text-center text-[15px] font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background:
                      isClay || isInk
                        ? 'var(--color-cream)'
                        : 'var(--color-ink)',
                    color:
                      isClay || isInk
                        ? 'var(--color-ink)'
                        : 'var(--color-cream)',
                  }}
                >
                  {card.kind === 'plan' ? 'Assinar mensal' : 'Comprar'} →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link
          to="/planos"
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          ver todos os planos →
        </Link>
      </div>
    </section>
  );
}

function packCard(
  offer: PublicPackOffer,
  pixDiscountPercent: number,
  tone: CardData['tone'],
  destaque = false,
): CardData {
  const isAvulso = offer.classes === 1;
  const title = isAvulso ? 'Avulso' : `Pacote ${offer.classes}`;
  const perClass = Math.round(offer.priceCents / offer.classes);
  const sub = isAvulso
    ? `1 aula  ·  vale por ${offer.expirationDays} dias`
    : `${formatCents(perClass)} a aula  ·  ${offer.expirationDays} dias`;
  const bullets: string[] = [
    isAvulso
      ? '1 aula a sua escolha'
      : `${offer.classes} aulas em ${offer.expirationDays} dias`,
    'Reserva da bike no site',
    'Toalha e ducha',
    pixDiscountPercent > 0
      ? `${pixDiscountPercent}% off pagando no Pix`
      : 'Pagamento Pix, crédito ou débito',
  ];
  const resolved = resolveDiscount(offer.priceCents, offer);
  return {
    key: `pack-${offer.id}`,
    kind: 'pack',
    title,
    priceCents: offer.priceCents,
    sub,
    bullets,
    discount: resolved
      ? {
          percent: resolved.percent,
          discountedCents: resolved.discountedCents,
          endsAt: resolved.endsAt,
        }
      : null,
    ctaHref: `/checkout?packOfferId=${offer.id}`,
    tone,
    destaque,
  };
}

function planCard(
  plan: PublicPlan,
  tone: CardData['tone'],
  destaque = false,
): CardData {
  const ilimitado = plan.monthlyCredits >= 999;
  const sub = ilimitado
    ? 'por mês  ·  ilimitado, todo mês'
    : `${plan.monthlyCredits} aulas/mês  ·  cobrança mensal`;
  const bullets = [
    ilimitado ? 'Aulas ilimitadas' : `${plan.monthlyCredits} aulas no mês`,
    'Reserva 7 dias antes',
    'Recibo no seu e-mail',
    'Cancele quando quiser',
  ];
  const resolved = resolveDiscount(plan.priceCents, plan);
  return {
    key: `plan-${plan.id}`,
    kind: 'plan',
    title: plan.name,
    priceCents: plan.priceCents,
    sub,
    bullets,
    discount: resolved
      ? {
          percent: resolved.percent,
          discountedCents: resolved.discountedCents,
          endsAt: resolved.endsAt,
        }
      : null,
    ctaHref: `/checkout?planId=${plan.id}`,
    tone,
    destaque,
  };
}
