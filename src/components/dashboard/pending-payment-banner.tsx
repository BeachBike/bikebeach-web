import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMyPendingPayment, usePaymentPolling } from '@/api/me';

/// Dashboard banner that resumes a payment the user may have left mid-flight
/// (closed the checkout tab, phone locked). It latches onto the most recent
/// in-flight charge and polls it to resolution — so someone who paid off-app
/// still sees "confirmado" when they come back, and someone whose charge
/// failed/expired gets a clear next step instead of a silent dead end.
///
/// Accessibility: the status line is a polite live region so screen readers
/// announce "confirmando → confirmado" without the user hunting for it.
export function PendingPaymentBanner() {
  const pending = useMyPendingPayment();
  // Latch the id so the banner survives the moment the payment leaves the
  // pending list (on PAID, `useMyPayments` refetches and `pending` goes null)
  // — we still want to show the celebratory "confirmado" state.
  const [watchedId, setWatchedId] = useState<string | null>(null);

  // Latch onto a newly-appeared pending payment. Intentional state sync from
  // query data; `set-state-in-effect` is disabled because the alternative
  // (deriving) can't preserve the id after the payment leaves the pending
  // list on PAID, which is exactly when we need it to show "confirmado".
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pending && pending.id !== watchedId) setWatchedId(pending.id);
  }, [pending, watchedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const paymentQ = usePaymentPolling(watchedId ?? undefined, {
    enabled: !!watchedId,
  });
  const status = paymentQ.data?.status ?? pending?.status ?? null;

  // Auto-dismiss the success state after a few seconds (setState lives in a
  // timeout callback, so it's not a synchronous effect write).
  useEffect(() => {
    if (status === 'PAID') {
      const t = setTimeout(() => setWatchedId(null), 6000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!watchedId || !status) return null;

  if (status === 'PAID') {
    return (
      <Shell tone="ok" onClose={() => setWatchedId(null)}>
        <span aria-hidden>🎉</span> pagamento confirmado — seus créditos já
        estão na carteira.
      </Shell>
    );
  }

  if (status === 'EXPIRED' || status === 'FAILED') {
    return (
      <Shell tone="warn" onClose={() => setWatchedId(null)}>
        Não conseguimos confirmar seu pagamento.{' '}
        <Link to="/planos" className="font-bold underline underline-offset-2">
          gerar um novo
        </Link>
        .
      </Shell>
    );
  }

  // PENDING / IN_REVIEW
  return (
    <Shell tone="info">
      <span
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink align-[-2px]"
        aria-hidden
      />{' '}
      {status === 'IN_REVIEW'
        ? 'seu cartão está em análise — a gente te avisa assim que aprovar.'
        : 'confirmando seu pagamento… pode deixar aberto, a gente atualiza sozinho.'}
    </Shell>
  );
}

function Shell({
  tone,
  onClose,
  children,
}: {
  tone: 'info' | 'ok' | 'warn';
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const bg =
    tone === 'ok'
      ? 'var(--color-sea)'
      : tone === 'warn'
        ? 'var(--color-clay-d)'
        : 'var(--color-cream-2)';
  const fg = tone === 'info' ? 'var(--color-ink)' : 'var(--color-cream)';
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-5 flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-[13.5px] font-medium"
      style={{ background: bg, color: fg }}
    >
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dispensar"
          className="shrink-0 rounded-full px-2 py-1 text-[15px] leading-none opacity-80 hover:opacity-100"
          style={{ color: fg }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
