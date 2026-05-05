import type { CreditPack } from '@/api/me';
import { firstName } from '@/lib/format';

interface Props {
  userName: string | undefined;
  packs: CreditPack[] | undefined;
  onStart: () => void;
}

/// Cerimony hero — sets tone before the 3-step flow. Stats card on the side
/// shows the user's strongest active pack.
export function Intro({ userName, packs, onStart }: Props) {
  const now = new Date();
  const active = (packs ?? []).filter(
    (p) =>
      p.remainingCredits > 0 &&
      (!p.expiresAt || new Date(p.expiresAt) > now),
  );
  const main = [...active].sort(
    (a, b) => b.remainingCredits - a.remainingCredits,
  )[0];
  const totalRemaining = active.reduce(
    (acc, p) => acc + p.remainingCredits,
    0,
  );
  const packLabel = main
    ? main.source === 'SUBSCRIPTION_CYCLE'
      ? 'do plano mensal'
      : `do pacote ${main.totalCredits}`
    : 'sem pacote ativo';

  const greetingName = firstName(userName) || 'você';

  return (
    <section className="fadeup relative flex min-h-[calc(100vh-60px)] flex-col justify-center overflow-hidden pb-16 pt-10">
      {/* Sun gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[30%] h-[60vw] max-h-[720px] w-[60vw] max-w-[720px] rounded-full opacity-35"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, var(--color-sun) 0%, var(--color-clay) 40%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />

      <div className="relative">
        <div className="mb-5 flex items-center gap-2.5 text-clay">
          <span className="h-px w-8 bg-clay" />
          <span className="text-xs font-bold uppercase tracking-widest">
            reservar uma aula
          </span>
        </div>

        <h1
          className="display-tight text-ink"
          style={{
            fontSize: 'clamp(56px, 10vw, 124px)',
            lineHeight: 0.88,
            letterSpacing: '-0.04em',
          }}
        >
          oi, {greetingName}.
          <br />
          <span className="font-normal italic text-ink-2">
            vem pedalar
            <br />
            na areia.
          </span>
        </h1>

        <p
          className="mt-9 max-w-[520px] leading-relaxed text-ink-2"
          style={{ fontSize: 'clamp(15px, 1.6vw, 18px)' }}
        >
          Vamos escolher juntos: primeiro o horário, depois sua bike na arena,
          e a gente confirma. Leva uns 30 segundos.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-3.5 rounded-full bg-clay px-9 py-5 text-[17px] font-semibold text-cream shadow-[0_24px_50px_-16px_rgba(216,93,52,0.55)] transition-transform duration-200 hover:-translate-y-1"
          >
            começar →
          </button>
          {main ? (
            <div className="hidden flex-col text-[13px] text-ink-2 md:flex">
              <span>
                <b>
                  {totalRemaining} aula{totalRemaining === 1 ? '' : 's'}
                </b>{' '}
                {packLabel}
              </span>
              <span className="mt-0.5 opacity-75">
                essa reserva consome 1
              </span>
            </div>
          ) : (
            <div className="hidden flex-col text-[13px] text-ink-2 md:flex">
              <span>sem créditos no momento</span>
              <span className="mt-0.5 opacity-75">
                compre um pacote pra reservar
              </span>
            </div>
          )}
        </div>

        <div className="mt-20 flex flex-wrap gap-9 border-t border-sand pt-8">
          {[
            { n: '01', t: 'escolha o horário', s: '7 dias na frente' },
            { n: '02', t: 'escolha sua bike', s: 'arena com 32 bikes' },
            { n: '03', t: 'confirme & pedale', s: 'crédito do pacote' },
          ].map((p) => (
            <div
              key={p.n}
              className="flex flex-1 basis-[200px] flex-col gap-1.5"
            >
              <span
                className="display-tight mono text-clay"
                style={{ fontSize: 32, lineHeight: 1 }}
              >
                {p.n}
              </span>
              <span
                className="display-tight"
                style={{ fontSize: 20, lineHeight: 1.1 }}
              >
                {p.t}
              </span>
              <span className="text-[13px] text-ink-2">{p.s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
