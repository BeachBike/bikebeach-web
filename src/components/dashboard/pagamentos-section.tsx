import type { Payment } from '@/api/me';
import { Pagination, usePagination } from '@/components/common';
import {
  formatCents,
  formatFullDate,
  paymentMethodLabel,
} from '@/lib/format';

interface Props {
  payments: Payment[] | undefined;
}

function paymentDescription(p: Payment): string {
  if (p.kind === 'SUBSCRIPTION_CYCLE') return 'mensalidade';
  if (p.kind === 'ONE_OFF_PACK' && p.packCredits) {
    return p.packCredits === 1 ? 'avulso' : `pacote ${p.packCredits}`;
  }
  return 'pagamento';
}

function statusLabel(s: Payment['status']): string {
  switch (s) {
    case 'PAID':
      return 'pago';
    case 'PENDING':
      return 'pendente';
    case 'FAILED':
      return 'falhou';
    case 'REFUNDED':
      return 'estornado';
    case 'EXPIRED':
      return 'QR expirou';
    default:
      return s;
  }
}

function statusColor(s: Payment['status']): string {
  switch (s) {
    case 'PAID':
      return 'var(--color-sea)';
    case 'PENDING':
      return 'var(--color-sun)';
    case 'FAILED':
      return 'var(--color-clay-d)';
    case 'EXPIRED':
      return 'var(--color-clay-d)';
    case 'REFUNDED':
      return 'var(--color-ink-2)';
    default:
      return 'var(--color-ink-2)';
  }
}

export function PagamentosSection({ payments }: Props) {
  const list = (payments ?? []).slice().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  // Page size 5 by request — payments rows are shorter, more density would
  // overrun the right column on the "meu plano" tab.
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } =
    usePagination(list, 5);

  return (
    <div className="col-span-12 min-h-[340px] rounded-[22px] bg-cream-2 p-7 lg:col-span-7">
      <h2 className="display-tight" style={{ fontSize: 36 }}>
        histórico de pagamentos
      </h2>
      {list.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-cream px-6 py-10 text-center text-sm text-ink-2">
          ainda sem compras. Quando você assinar ou comprar um pacote, ele
          aparece aqui.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-2">
            {pageItems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-cream px-5 py-3.5"
              >
                <div className="flex-1">
                  <div
                    className="display-tight"
                    style={{ fontSize: 18 }}
                  >
                    {paymentDescription(p)}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-2">
                    {formatFullDate(p.createdAt)} ·{' '}
                    {paymentMethodLabel(p.method)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {formatCents(p.amountCents)}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: statusColor(p.status) }}
                  >
                    {statusLabel(p.status)}
                  </span>
                  {p.status === 'PENDING' && (
                    // Confirmation usually lands via webhook in seconds, but
                    // if it's delayed/missed the reconciliation cron catches
                    // it within ~5 min. Set expectations so the user doesn't
                    // think the payment failed.
                    <span className="mt-0.5 max-w-[180px] text-right text-[10px] leading-tight text-ink-3">
                      pode levar até 5 min pra confirmar — não precisa pagar
                      de novo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}
