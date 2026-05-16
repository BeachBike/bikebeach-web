import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { formatCents } from '@/lib/format';

interface Props {
  productName: string;
  amountCents: number;
  method: string;
  title?: string;
  message?: ReactNode;
  status?: string;
}

/// Final ✓ + auto-redirect to dashboard. Mirror the prototype's
/// "pop" + progress fill animation.
export function CheckoutSuccess({
  productName,
  amountCents,
  method,
  title = 'pagamento aprovado.',
  message,
  status = 'aprovado',
}: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(
      () => navigate('/dashboard', { replace: true }),
      3500,
    );
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="px-5 py-10 text-center">
      <div
        className="mx-auto grid h-[90px] w-[90px] place-items-center rounded-full"
        style={{
          background: 'var(--color-sea)',
          animation: 'bb-pop .4s ease',
        }}
      >
        <span className="text-5xl text-cream">✓</span>
      </div>
      <div
        className="display mt-6"
        style={{ fontSize: 'clamp(34px,8vw,88px)', lineHeight: 0.9 }}
      >
        {title.split(' ')[0]}
        <br />
        <span className="font-normal italic text-clay">
          {title.split(' ').slice(1).join(' ')}
        </span>
      </div>
      <p className="mx-auto mt-4 max-w-[480px] text-[17px] text-ink-2">
        {message ?? (
          <>
            <b>{productName}</b> liberado na sua conta. recibo enviado pro seu
            e-mail pela asaas.
          </>
        )}
      </p>
      <div className="mx-auto mt-7 inline-flex flex-col gap-2 rounded-2xl bg-cream-2 px-6 py-4 text-left">
        <Row k="produto" v={productName} />
        <Row k="valor" v={formatCents(amountCents)} />
        <Row k="forma" v={method} />
        <Row k="status" v={status} />
      </div>
      <p className="mt-7 text-[13px] text-ink-2">
        levando você pro painel…
      </p>
      <div className="mx-auto mt-3.5 h-1.5 max-w-[280px] overflow-hidden rounded-full bg-cream-2">
        <div
          className="h-full bg-clay"
          style={{ animation: 'bb-fill 3s linear forwards' }}
        />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6 text-sm">
      <span className="text-ink-2">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
