import { useState } from 'react';
import { Link } from 'react-router';

interface Plano {
  nome: string;
  preco: string;
  sub: string;
  bullets: readonly string[];
  cta: string;
  tone: 'cream' | 'clay' | 'ink';
  destaque?: boolean;
}

/// Pricing pulled from the backend seed (PackOffer + Plan rows). When we go
/// live we'll replace these with a TanStack Query call to /pack-offers.
/// For now they're the source of truth on the home page.
const PLANOS: readonly Plano[] = [
  {
    nome: 'Avulso',
    preco: '49,99',
    sub: 'a aula  ·  vale por 30 dias',
    bullets: [
      '1 aula a sua escolha',
      'Reserva da bike no site',
      'Toalha e ducha',
      '5% off no Pix',
    ],
    cta: 'Comprar 1 aula',
    tone: 'cream',
  },
  {
    nome: 'Pacote 10',
    preco: '349,99',
    sub: 'R$ 35 a aula  ·  você economiza 30%',
    bullets: [
      '10 aulas em 90 dias',
      'Reserva 7 dias antes',
      'Toalha e ducha',
      '5% off no Pix',
    ],
    cta: 'Comprar pacote',
    tone: 'clay',
    destaque: true,
  },
  {
    nome: 'Mensal Ilimitado',
    preco: '449,99',
    sub: 'por mês  ·  ilimitado, todo mês',
    bullets: [
      'Aulas ilimitadas',
      'Reserva 7 dias antes',
      'Recibo no seu e-mail',
      'Cancele quando quiser',
    ],
    cta: 'Assinar mensal',
    tone: 'ink',
  },
];

export function Planos() {
  const [ativo, setAtivo] = useState(1);

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

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {PLANOS.map((p, i) => {
          const on = ativo === i;
          const isClay = p.tone === 'clay';
          const isInk = p.tone === 'ink';
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
              key={p.nome}
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
              {p.destaque && (
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
                {p.nome}
              </div>
              <div className="mt-7 flex items-start gap-1.5">
                <span className="mt-3.5 text-2xl font-semibold">R$</span>
                <span
                  className="display font-medium"
                  style={{ fontSize: 96, lineHeight: 0.9 }}
                >
                  {p.preco}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-medium opacity-85">
                {p.sub}
              </div>
              <ul className="mt-7 flex flex-1 flex-col gap-3.5 list-none">
                {p.bullets.map((b) => (
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
                to="/cadastro"
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
                {p.cta} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
