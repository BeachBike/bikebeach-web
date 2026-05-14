import { Link } from 'react-router';
import { useEffectiveArena } from '@/api/public';
import { useRoleHome } from '@/hooks/useRoleHome';
import SpinningBcImg from '@/assets/SpinningBc.png';

export function Hero() {
  const { unit } = useEffectiveArena();
  const bikeCount = unit?.operationalBikeCount;
  const home = useRoleHome();

  // Keep the copy human even before the API call resolves — fall back to
  // generic phrasing instead of flashing a number from nothing.
  const fleetLine = bikeCount
    ? `${bikeCount} bikes ancoradas`
    : 'frota ancorada na areia';

  return (
    <section className="relative min-h-screen px-7 pb-16 pt-[140px]">
      <div
        aria-hidden
        className="bb-breathe pointer-events-none absolute right-[-160px] top-[120px] z-0 h-[520px] w-[520px] rounded-full opacity-85"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--color-sun) 0%, var(--color-clay) 55%, transparent 75%)',
          filter: 'blur(2px)',
        }}
      />

      <div className="relative z-10">
        <h1
          className="display max-w-[95%] text-ink"
          style={{ fontSize: 'clamp(72px, 13vw, 220px)', lineHeight: 0.86 }}
        >
          pedale com o
          <br />
          <span className="font-normal italic text-clay">mar</span> batendo
          <br />
          no peito.
        </h1>

        <div className="mt-12 grid items-end gap-10 md:grid-cols-[1.1fr_.8fr_1fr]">
          <p className="max-w-[480px] text-lg font-normal leading-snug text-ink-2 md:text-xl">
            Spinning na faixa de areia, em Balneário Camboriú. {fleetLine},
            vento batendo, instrutor gritando playlist e o oceano logo ali.
            Aula é assim, sem teto.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to={home ?? '/cadastro'}
              className="inline-flex items-center justify-between gap-3 rounded-full bg-clay px-7 py-5 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,.6)] transition-colors hover:bg-clay-d"
            >
              {home ? 'Abrir meu painel' : 'Reservar minha bike'} <span>→</span>
            </Link>
            <a
              href="#planos"
              className="inline-flex items-center justify-between gap-3 rounded-full border-[1.5px] border-ink px-7 py-5 text-base font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              Ver planos <span>→</span>
            </a>
          </div>

          <div>
            <img
              src={SpinningBcImg}
              alt="arena na areia, gente pedalando ao pôr do sol"
              className="w-full rounded-[14px] object-cover"
              style={{ aspectRatio: '5/4' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
