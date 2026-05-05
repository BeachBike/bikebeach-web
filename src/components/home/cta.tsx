import { Link } from 'react-router';

export function CTA() {
  return (
    <section
      id="reservar"
      className="relative overflow-hidden bg-clay px-7 pb-24 pt-[140px] text-cream"
    >
      {/* Decorative sun in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full opacity-60"
        style={{
          background: 'var(--color-sun)',
          filter: 'blur(2px)',
        }}
      />

      <div className="relative">
        <h2
          className="display font-medium text-cream"
          style={{ fontSize: 'clamp(96px,18vw,320px)', lineHeight: 0.82 }}
        >
          bora
          <br />
          <span className="font-normal italic">pedalar?</span>
        </h2>
        <div className="mt-14 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-3">
            <Link
              to="/cadastro"
              className="rounded-full bg-ink px-8 py-5 text-base font-semibold text-cream transition-colors hover:bg-ink-2"
            >
              Criar minha conta →
            </Link>
            <Link
              to="/login"
              className="rounded-full border-[1.5px] border-cream px-8 py-5 text-base font-semibold transition-colors hover:bg-cream hover:text-ink"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="max-w-[300px] text-right text-[17px] font-medium">
            Cancele até <b>8h antes</b> da aula.
            <br />
            Crédito volta pra carteira, sem custo.
          </p>
        </div>
      </div>
    </section>
  );
}
