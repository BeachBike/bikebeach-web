import { useState } from 'react';

const STEPS = [
  {
    n: '01',
    t: 'Crie sua conta',
    d: 'Email, senha, e fim. Cadastro em menos de um minuto, sem firula.',
  },
  {
    n: '02',
    t: 'Escolha um plano',
    d: 'Aula avulsa, pacote ou mensal. Pague no Pix (com desconto), crédito ou débito — você decide.',
  },
  {
    n: '03',
    t: 'Reserve a bike',
    d: 'Veja o mapa da arena e escolhe o número. Frente do mar é a fila A.',
  },
  {
    n: '04',
    t: 'Apareça e pedale',
    d: 'Chegue 10 minutos antes, deixa o tênis na entrada e o resto a gente cuida.',
  },
] as const;

export function Como() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section id="como" className="px-7 pb-[120px] pt-[140px]">
      <h2
        className="display-tight max-w-[1200px]"
        style={{ fontSize: 'clamp(56px, 9vw, 140px)', lineHeight: 0.92 }}
      >
        Quatro passos.
        <br />
        <span className="font-normal italic text-clay">Zero</span> burocracia.
      </h2>

      <div className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const on = hover === i;
          return (
            <div
              key={s.n}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex min-h-[280px] cursor-default flex-col rounded-lg p-7 pb-9 transition-colors duration-300"
              style={{
                background: on ? 'var(--color-clay)' : 'var(--color-cream-2)',
                color: on ? 'var(--color-cream)' : 'var(--color-ink)',
              }}
            >
              <span
                className="display-tight opacity-80"
                style={{ fontSize: 60, lineHeight: 1 }}
              >
                {s.n}
              </span>
              <span
                className="display-tight mt-12"
                style={{ fontSize: 30, lineHeight: 1.05 }}
              >
                {s.t}
              </span>
              <span className="mt-3 text-[15px] leading-snug opacity-85">
                {s.d}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
