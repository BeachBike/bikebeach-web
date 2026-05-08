import { Link } from 'react-router';
import type { CreditPack } from '@/api/me';
import type { PublicPackOffer, PublicUnit } from '@/api/public';
import { PIX_DISCOUNT_PERCENT } from '@/lib/constants';
import { formatCents } from '@/lib/format';
import { resolveDiscount, shortDate } from '@/lib/discount';

interface Props {
  offer: PublicPackOffer;
  unit: PublicUnit | undefined;
  /// User's matching active pack of the same size (if any). When set we
  /// render a "you already have one" hint and the CTA reads "comprar mais".
  myMatchingPack: CreditPack | null;
  loggedIn: boolean;
  highlighted: boolean;
}

/// Single pack offer card. Tone alternates clay/cream/ink/sand based on size
/// so the page has visual rhythm even with N offers.
export function PackCard({
  offer,
  unit,
  myMatchingPack,
  loggedIn,
  highlighted,
}: Props) {
  const isAvulso = offer.classes === 1;
  const labelTitle = isAvulso ? 'Avulso' : `Pacote ${offer.classes}`;
  const perClassCents = Math.round(offer.priceCents / offer.classes);
  const sub = isAvulso
    ? `1 aula  ·  vale por ${offer.expirationDays} dias`
    : `${formatCents(perClassCents)} a aula  ·  vale por ${offer.expirationDays} dias`;

  // C3 — campaign discount (sazonal, time-windowed). Distinct from the
  // pixDiscount below (always-on, applied at PIX checkout).
  const campaign = resolveDiscount(offer.priceCents, offer);
  const effectivePriceCents = campaign?.discountedCents ?? offer.priceCents;

  // 2026-05 — PIX discount is a system-wide constant. Compounds with
  // the campaign discount: the campaign is applied first (above), then
  // PIX % comes off the already-discounted price.
  void unit; // unit param kept on the prop signature for backwards compat
  const pixDiscountPercent = PIX_DISCOUNT_PERCENT;
  const pixCents =
    pixDiscountPercent > 0
      ? Math.round(effectivePriceCents * (1 - pixDiscountPercent / 100))
      : null;

  const tone = highlighted ? 'clay' : 'cream';
  const isClay = tone === 'clay';
  const accent = isClay ? 'var(--color-cream)' : 'var(--color-clay)';

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

  return (
    <article
      className="relative flex min-h-[460px] flex-col rounded-[22px] p-7 transition-shadow"
      style={{
        background: isClay ? 'var(--color-clay)' : 'var(--color-cream-2)',
        color: isClay ? 'var(--color-cream)' : 'var(--color-ink)',
        boxShadow: highlighted
          ? '0 30px 60px -28px rgba(34,28,22,.45)'
          : 'none',
      }}
    >
      {highlighted && (
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

      {myMatchingPack && (
        <span
          className="mb-3 w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: isClay
              ? 'rgba(246,239,226,0.15)'
              : 'var(--color-success)',
            color: 'var(--color-cream)',
          }}
        >
          você tem {myMatchingPack.remainingCredits} restantes
        </span>
      )}

      <div className="display-tight" style={{ fontSize: 32, lineHeight: 1 }}>
        {labelTitle}
      </div>

      {campaign && (
        <span
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: isClay
              ? 'rgba(246,239,226,0.18)'
              : 'var(--color-clay)',
            color: 'var(--color-cream)',
          }}
        >
          −{campaign.percent}% até {shortDate(campaign.endsAt)}
        </span>
      )}

      <div className="mt-6 flex items-start gap-1.5">
        <span className="mt-3 text-2xl font-semibold">R$</span>
        <span
          className="display font-medium"
          style={{ fontSize: 88, lineHeight: 0.9 }}
        >
          {formatCents(effectivePriceCents).replace('R$', '').trim()}
        </span>
      </div>
      {campaign && (
        <div className="mt-1 text-[13px] opacity-70 line-through">
          de {formatCents(offer.priceCents)}
        </div>
      )}
      <div className="mt-1 text-sm font-medium opacity-85">{sub}</div>

      {pixCents !== null && (
        <div className="mt-3 text-[13px] font-medium opacity-90">
          {formatCents(pixCents)} no Pix com {pixDiscountPercent}% off
        </div>
      )}

      <ul className="mt-6 flex flex-1 list-none flex-col gap-3 text-[15px]">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 leading-snug">
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
        to={
          loggedIn
            ? `/checkout?packOfferId=${offer.id}`
            : `/login?next=${encodeURIComponent(`/checkout?packOfferId=${offer.id}`)}`
        }
        className="mt-6 rounded-full py-3.5 text-center text-[15px] font-semibold transition-opacity hover:opacity-90"
        style={{
          background: isClay
            ? 'var(--color-cream)'
            : 'var(--color-ink)',
          color: isClay
            ? 'var(--color-ink)'
            : 'var(--color-cream)',
        }}
      >
        {myMatchingPack
          ? 'Comprar mais →'
          : isAvulso
            ? 'Comprar 1 aula →'
            : 'Comprar pacote →'}
      </Link>
    </article>
  );
}
