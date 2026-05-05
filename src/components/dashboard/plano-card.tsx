import { Link } from 'react-router';
import type { CreditPack } from '@/api/me';
import { formatFullDate } from '@/lib/format';

interface Props {
  packs: CreditPack[] | undefined;
}

/// Pick the user's "main" plan card: the active pack with the most total
/// credits. Falls back to an empty-state when the user has nothing.
export function PlanoCard({ packs }: Props) {
  const now = new Date();
  const active = (packs ?? []).filter(
    (p) =>
      p.remainingCredits > 0 &&
      (!p.expiresAt || new Date(p.expiresAt) > now),
  );
  const main = [...active].sort((a, b) => b.totalCredits - a.totalCredits)[0];

  if (!main) {
    return (
      <div className="col-span-12 flex min-h-[340px] flex-col justify-between rounded-[22px] bg-cream-2 p-7 lg:col-span-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            seu plano atual
          </div>
          <div
            className="display-tight mt-3.5"
            style={{ fontSize: 48, lineHeight: 1 }}
          >
            sem plano
          </div>
          <p className="mt-2 text-sm text-ink-2">
            Compre um pacote ou assine o mensal pra reservar bikes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/planos"
            className="flex-1 rounded-full bg-ink px-4 py-3.5 text-center text-sm font-semibold text-cream"
          >
            ver planos
          </Link>
        </div>
      </div>
    );
  }

  const usadas = main.totalCredits - main.remainingCredits;
  const total = main.totalCredits;
  const pct = total > 0 ? (usadas / total) * 100 : 0;
  const sourceLabel: Record<CreditPack['source'], string> = {
    PURCHASE_PACK:
      total === 1 ? 'avulso' : `pacote ${total}`,
    SUBSCRIPTION_CYCLE: 'mensal ilimitado',
    ADMIN_GRANT: 'cortesia',
    REFUND: 'crédito reembolsado',
  };

  return (
    <div className="col-span-12 flex min-h-[340px] flex-col justify-between rounded-[22px] bg-cream-2 p-7 lg:col-span-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-clay">
          seu plano atual
        </div>
        <div
          className="display-tight mt-3.5"
          style={{ fontSize: 48, lineHeight: 1 }}
        >
          {sourceLabel[main.source]}
        </div>
        <div className="mt-2 text-sm text-ink-2">
          {`comprado em ${formatFullDate(main.createdAt)}`}
          {main.expiresAt
            ? ` · vence em ${formatFullDate(main.expiresAt)}`
            : ''}
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-end justify-between">
          <span className="text-[13px] font-semibold text-ink-2">
            aulas usadas
          </span>
          <span className="display-tight" style={{ fontSize: 24 }}>
            {usadas}
            <span className="text-lg opacity-50"> / {total}</span>
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-clay transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Cell strip — visual indicator. Capped so it doesn't blow up for
            unlimited plans (mensal ilimitado uses 999 totalCredits). */}
        {total <= 30 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className="h-2 min-w-[14px] flex-1 rounded-[3px]"
                style={{
                  background:
                    i < usadas
                      ? 'var(--color-clay)'
                      : 'var(--color-sand)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link
          to="/planos"
          className="flex-1 rounded-full bg-ink px-4 py-3.5 text-center text-sm font-semibold text-cream"
        >
          renovar
        </Link>
        <Link
          to="/planos"
          className="flex-1 rounded-full border-[1.5px] border-ink px-4 py-3.5 text-center text-sm font-semibold"
        >
          mudar plano
        </Link>
      </div>
    </div>
  );
}
