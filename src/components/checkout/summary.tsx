import { formatCents } from '@/lib/format';

interface Props {
  productName: string;
  productDesc: string;
  baseCents: number;
  discountCents: number;
  /// Some products (subscriptions) bill recurring; we hide the discount
  /// line since the backend handles plan pricing without per-method delta.
  showDiscount: boolean;
  pixDiscountPercent: number;
}

export function CheckoutSummary({
  productName,
  productDesc,
  baseCents,
  discountCents,
  showDiscount,
  pixDiscountPercent,
}: Props) {
  const total = baseCents - (showDiscount ? discountCents : 0);

  return (
    <aside className="sticky top-[90px] self-start rounded-[22px] bg-cream-2 p-6">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        seu pedido
      </div>
      <div
        className="display-tight mt-2.5"
        style={{ fontSize: 32, lineHeight: 1 }}
      >
        {productName}
      </div>
      <p className="mt-1.5 text-sm text-ink-2">{productDesc}</p>

      <div className="mt-6 flex flex-col gap-2.5 border-t border-sand pt-4">
        <Row k="subtotal" v={formatCents(baseCents)} />
        {showDiscount && discountCents > 0 && (
          <Row
            k={`desconto pix (-${pixDiscountPercent}%)`}
            v={`- ${formatCents(discountCents)}`}
            tone="clay"
          />
        )}
        <div className="my-1.5 h-px bg-sand" />
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold">total</span>
          <span className="display-tight" style={{ fontSize: 36 }}>
            {formatCents(total)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-xl bg-cream px-3.5 py-3 text-xs leading-snug text-ink-2">
        <span className="text-sm font-bold text-sea">🔒</span>
        <span>
          pagamento processado pela <b>asaas</b>. seus dados não passam pelo
          nosso servidor.
        </span>
      </div>
    </aside>
  );
}

function Row({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone?: 'clay';
}) {
  return (
    <div className="flex justify-between gap-6 text-sm">
      <span className="text-ink-2">{k}</span>
      <span
        className="font-semibold"
        style={{ color: tone === 'clay' ? 'var(--color-clay)' : undefined }}
      >
        {v}
      </span>
    </div>
  );
}
