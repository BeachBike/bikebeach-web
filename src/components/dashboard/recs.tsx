import { Link } from 'react-router';
import type { Reservation } from '@/api/me';
import { useDefaultUnit, useTodayClassSlots } from '@/api/public';
import { formatHourMinute, intensityLabel } from '@/lib/format';

interface Props {
  reservations: Reservation[] | undefined;
}

const TONES = ['clay', 'sea', 'sun'] as const;
type Tone = (typeof TONES)[number];

/// Today's available classes the user hasn't reserved yet. Up to 3 cards in
/// rotating tones. Hidden entirely when nothing's free.
export function Recs({ reservations }: Props) {
  const { unit } = useDefaultUnit();
  const { data: slots } = useTodayClassSlots(unit?.id, 0);

  const reservedSlotIds = new Set(
    (reservations ?? [])
      .filter((r) => r.status === 'ACTIVE' || r.status === 'CHECKED_IN')
      .map((r) => r.classSlotId),
  );

  const now = new Date();
  const candidates = (slots ?? [])
    .filter(
      (s) =>
        new Date(s.startsAt) > now &&
        s.freeSpots > 0 &&
        !reservedSlotIds.has(s.id),
    )
    .slice(0, 3);

  if (candidates.length === 0) return null;

  return (
    <section className="col-span-12 mt-5">
      <h2
        className="display-tight mb-3.5"
        style={{ fontSize: 36 }}
      >
        sugestões pra hoje
      </h2>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {candidates.map((s, i) => {
          const tone: Tone = TONES[i % TONES.length]!;
          const titulo =
            s.classKind?.name?.toLowerCase() ?? s.title ?? 'aula';
          return (
            <Link
              key={s.id}
              to={`/reservar?slot=${s.id}`}
              className="flex min-h-[200px] flex-col justify-between rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-1"
              style={{
                background:
                  tone === 'clay'
                    ? 'var(--color-clay)'
                    : tone === 'sea'
                      ? 'var(--color-sea)'
                      : 'var(--color-sun)',
                color:
                  tone === 'sun'
                    ? 'var(--color-ink)'
                    : 'var(--color-cream)',
              }}
            >
              <div>
                <div className="text-[13px] font-bold opacity-85">
                  {formatHourMinute(s.startsAt)}
                </div>
                <div
                  className="display-tight mt-2"
                  style={{ fontSize: 34, lineHeight: 1 }}
                >
                  {titulo}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold opacity-85">
                  com {s.instructor.name.split(' ')[0]?.toLowerCase()} ·{' '}
                  {intensityLabel(s.classKind?.intensity)}
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">
                    {s.freeSpots} bike{s.freeSpots === 1 ? '' : 's'} livre
                    {s.freeSpots === 1 ? '' : 's'}
                  </span>
                  <span className="text-2xl">→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
