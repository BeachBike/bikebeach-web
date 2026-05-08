import {
  type FeaturedInstructor,
  useDefaultUnit,
  useFeaturedInstructors,
} from '@/api/public';
import { Placeholder } from './placeholder';

type PlaceholderTone = 'clay' | 'sun' | 'sea' | 'sand' | 'cream' | 'ink';

const COLOR_TONE: Record<
  NonNullable<FeaturedInstructor['primaryClassKind']>['colorToken'],
  PlaceholderTone
> = {
  CLAY: 'clay',
  SUN: 'sun',
  SEA: 'sea',
  SAND: 'sand',
  INK: 'ink',
  // Placeholder doesn't ship a green tone — fall back to sea since GREEN is
  // close to the seaside vibe and pairs well with cream-2 background.
  GREEN: 'sea',
};

export function Instrutores() {
  const { unit } = useDefaultUnit();
  const { data: instructors, isLoading } = useFeaturedInstructors(unit?.id, 4);

  const list = instructors ?? [];

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

      {isLoading && list.length === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-sand-2 bg-cream px-6 py-10 text-center text-sm text-ink-2">
          Time em formação — em breve a galera certa pra te conduzir no pedal
          aparece aqui.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => {
            const tone: PlaceholderTone = p.primaryClassKind
              ? COLOR_TONE[p.primaryClassKind.colorToken]
              : 'sea';
            const [first, ...rest] = p.name.split(' ');
            const last = rest.join(' ');
            return (
              <article key={p.id} className="flex flex-col gap-5">
                <Placeholder
                  label={`retrato — ${first.toLowerCase()}`}
                  ratio="4/5"
                  tone={tone}
                />
                <div>
                  <div
                    className="display-tight"
                    style={{ fontSize: 36, lineHeight: 1 }}
                  >
                    {first}
                    {last && (
                      <>
                        {' '}
                        <span className="font-normal opacity-55">{last}</span>
                      </>
                    )}
                  </div>
                  {p.primaryClassKind && (
                    <div className="mt-2 text-sm font-semibold text-clay">
                      {p.primaryClassKind.name.toLowerCase()}
                    </div>
                  )}
                  {p.bio && (
                    <p className="mt-3 text-[15px] leading-snug text-ink-2">
                      {p.bio}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SkeletonCard() {
  return (
    <article className="flex flex-col gap-5">
      <Placeholder label="" ratio="4/5" tone="sand" />
      <div>
        <div
          className="h-9 w-2/3 animate-pulse rounded-md bg-sand"
          aria-hidden
        />
        <div
          className="mt-3 h-4 w-1/3 animate-pulse rounded-md bg-sand"
          aria-hidden
        />
        <div
          className="mt-3 h-3 w-full animate-pulse rounded-md bg-sand-2/60"
          aria-hidden
        />
      </div>
    </article>
  );
}
