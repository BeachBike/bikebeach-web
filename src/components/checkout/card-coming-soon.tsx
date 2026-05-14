interface Props {
  method: 'credito' | 'debito';
}

/// Placeholder for future card payments. The backend doesn't expose
/// `POST /payments/card-pack` yet — Asaas tokenization needs a separate
/// integration sprint. We keep the tab visible to set expectations.
export function CardComingSoon({ method }: Props) {
  const label = method === 'credito' ? 'cartão de crédito' : 'cartão de débito';

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_280px]">
      <div>
        <div
          className="display-tight"
          style={{ fontSize: 32, lineHeight: 1 }}
        >
          em breve.
        </div>
        <p className="mt-2 text-sm text-ink-2">
          O pagamento por <b>{label}</b> está sendo integrado com a Asaas em
          ambiente PCI-DSS — os dados do seu cartão nunca passam pelo nosso
          servidor.
        </p>
        <p className="mt-3 text-sm text-ink-2">
          Por enquanto, segue no <b>PIX</b> — confirma na hora e ainda dá
          desconto.
        </p>

        <ul className="mt-5 flex flex-col gap-2.5 text-[13px] text-ink-2">
          <li className="flex gap-3">
            <span className="font-bold text-clay">☼</span>
            tokenização Asaas (PCI scope: zero pra gente)
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-clay">☼</span>
            crédito até 6x · débito 1x
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-clay">☼</span>
            sem juros até 3x
          </li>
        </ul>
      </div>

      <div
        className="relative overflow-hidden rounded-[18px] p-6 text-cream"
        style={{
          background:
            'linear-gradient(135deg, var(--color-ink) 0%, #3a2f24 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, var(--color-clay), transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="grid h-[34px] w-[46px] place-items-center rounded-md bg-sun text-[10px] font-bold text-ink">
              chip
            </div>
            <span className="text-[13px] font-bold tracking-wider opacity-50">
              •••
            </span>
          </div>
          <div
            className="mono mt-7 text-lg tracking-[0.15em] opacity-50"
            style={{ fontWeight: 500 }}
          >
            •••• •••• •••• ••••
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">
                titular
              </div>
              <div className="mt-0.5 text-xs font-semibold opacity-50">
                em breve
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">
                vence
              </div>
              <div className="mono mt-0.5 text-xs font-semibold opacity-50">
                mm/aa
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
