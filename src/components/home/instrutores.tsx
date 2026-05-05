import { Placeholder } from './placeholder';

const PPL = [
  {
    nome: 'Marina',
    sobrenome: 'Vasques',
    bio: 'Quinze anos de spinning. Começa com calma, termina pedindo perdão.',
    esp: 'nascer e pôr do sol',
    tone: 'sea',
  },
  {
    nome: 'Diego',
    sobrenome: 'Rondon',
    bio: 'Ex-ciclista de pista. Não acredita em meio-termo. Playlist é arma.',
    esp: 'power · depois do escuro',
    tone: 'clay',
  },
  {
    nome: 'Camila',
    sobrenome: 'Soares',
    bio: 'Mistura HIIT com batida house. Sai com a camiseta torcida.',
    esp: 'beat drill',
    tone: 'sun',
  },
  {
    nome: 'Rafa',
    sobrenome: 'Pestana',
    bio: 'Trinta minutos cirúrgicos no almoço. Ninguém volta atrasado pro trampo.',
    esp: 'hora do almoço',
    tone: 'sand',
  },
] as const;

export function Instrutores() {
  return (
    <section
      id="instrutores"
      className="bg-cream-2 px-7 pb-[120px] pt-[120px]"
    >
      <div className="mb-14 flex flex-wrap items-end justify-between gap-5">
        <h2
          className="display-tight"
          style={{ fontSize: 'clamp(56px,9vw,140px)', lineHeight: 0.92 }}
        >
          A galera que
          <br />
          <span className="font-normal italic text-clay">conduz</span> o
          pedal.
        </h2>
        <p className="max-w-[340px] text-base text-ink-2">
          Time fixo da temporada. Cada um com a própria pegada — escolha pelo
          horário que combina com você.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PPL.map((p) => (
          <article key={p.nome} className="flex flex-col gap-5">
            <Placeholder
              label={`retrato — ${p.nome.toLowerCase()}`}
              ratio="4/5"
              tone={p.tone}
            />
            <div>
              <div
                className="display-tight"
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {p.nome}{' '}
                <span className="font-normal opacity-55">{p.sobrenome}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-clay">
                {p.esp}
              </div>
              <p className="mt-3 text-[15px] leading-snug text-ink-2">
                {p.bio}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
