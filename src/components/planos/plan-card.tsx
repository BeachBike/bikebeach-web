import { Link } from 'react-router';
import type { MySubscription } from '@/api/me';
import type { PublicPlan } from '@/api/public';
import { formatCents, formatFullDate } from '@/lib/format';
import { resolveDiscount, shortDate } from '@/lib/discount';

interface Props {
  plan: PublicPlan;
  /// User's matching active/past-due subscription, if any.
  myActiveSubscription: MySubscription | null;
  loggedIn: boolean;
  highlighted: boolean;
}

export function PlanCard({
  plan,
  myActiveSubscription,
  loggedIn,
  highlighted,
}: Props) {
  const ilimitado = plan.monthlyCredits >= 999;
  const sub = ilimitado
    ? 'por mes - ilimitado, todo mes'
    : `${plan.monthlyCredits} aulas/mes - cobranca mensal`;
  const isCurrent = !!myActiveSubscription;

  const tone = highlighted ? 'ink' : 'cream';
  const isInk = tone === 'ink';
  const accent = isInk ? 'var(--color-sun)' : 'var(--color-clay)';

  const bullets: string[] = [
    ilimitado ? 'Aulas ilimitadas' : `${plan.monthlyCredits} aulas no mes`,
    'Recibo automatico no seu e-mail',
    'Cancele quando quiser, sem multa',
  ];

  return (
    <article
      className="relative flex min-h-[460px] flex-col rounded-[22px] p-7 transition-shadow"
      style={{
        background: isInk ? 'var(--color-ink)' : 'var(--color-cream-2)',
        color: isInk ? 'var(--color-cream)' : 'var(--color-ink)',
        boxShadow: highlighted
          ? '0 30px 60px -28px rgba(34,28,22,.45)'
          : 'none',
      }}
    >
      {isCurrent && (
        <span
          className="mb-3 w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background:
              myActiveSubscription.status === 'PENDING_PAYMENT'
                ? 'var(--color-clay)'
                : myActiveSubscription.status === 'PAST_DUE'
                ? 'var(--color-clay)'
                : myActiveSubscription.status === 'CANCELLED'
                  ? 'var(--color-ink-2)'
                : 'var(--color-success)',
            color: 'var(--color-cream)',
          }}
        >
          {myActiveSubscription.status === 'PENDING_PAYMENT'
            ? 'aguardando pix'
            : myActiveSubscription.status === 'PAST_DUE'
            ? 'pagamento pendente'
            : myActiveSubscription.status === 'CANCELLED'
              ? 'cancelado'
            : 'plano atual'}
        </span>
      )}

      <div className="display-tight" style={{ fontSize: 32, lineHeight: 1 }}>
        {plan.name}
      </div>

      {(() => {
        const campaign = resolveDiscount(plan.priceCents, plan);
        const effectiveCents = campaign?.discountedCents ?? plan.priceCents;
        return (
          <>
            {campaign && (
              <span
                className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{
                  background: isInk
                    ? 'var(--color-sun)'
                    : 'var(--color-clay)',
                  color: isInk
                    ? 'var(--color-ink)'
                    : 'var(--color-cream)',
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
                {formatCents(effectiveCents).replace('R$', '').trim()}
              </span>
            </div>
            {campaign && (
              <div className="mt-1 text-[13px] opacity-70 line-through">
                de {formatCents(plan.priceCents)}
              </div>
            )}
            <div className="mt-1 text-sm font-medium opacity-85">{sub}</div>
          </>
        );
      })()}

      <ul className="mt-6 flex flex-1 list-none flex-col gap-3 text-[15px]">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 leading-snug">
            <span
              className="font-bold"
              style={{ color: accent }}
              aria-hidden
            >
              *
            </span>
            {b}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div
          className="mt-6 rounded-2xl px-4 py-3 text-center text-[13px] font-medium"
          style={{
            background: 'rgba(246,239,226,0.1)',
            color: isInk ? 'var(--color-cream)' : 'var(--color-ink)',
          }}
        >
          {myActiveSubscription.status === 'PENDING_PAYMENT' ? (
            'creditos liberam quando o Pix confirmar'
          ) : (
            <>
              {myActiveSubscription.status === 'PAST_DUE'
                ? 'mensalidade pendente desde '
                : myActiveSubscription.status === 'CANCELLED'
                  ? 'valido ate '
                  : 'renovacao em '}
              <b>{formatFullDate(myActiveSubscription.currentPeriodEnd)}</b>
            </>
          )}
        </div>
      ) : (
        <Link
          to={
            loggedIn
              ? `/checkout?planId=${plan.id}`
              : `/login?next=${encodeURIComponent(`/checkout?planId=${plan.id}`)}`
          }
          className="mt-6 rounded-full py-3.5 text-center text-[15px] font-semibold transition-opacity hover:opacity-90"
          style={{
            background: isInk
              ? 'var(--color-cream)'
              : 'var(--color-ink)',
            color: isInk
              ? 'var(--color-ink)'
              : 'var(--color-cream)',
          }}
        >
          Assinar mensal &gt;
        </Link>
      )}
    </article>
  );
}
