import { useState } from 'react';
import { Link } from 'react-router';
import {
  useDefaultUnit,
  useTodayClassSlots,
  type PublicClassSlot,
} from '@/api/public';

const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

/// JS getDay() returns 0=Sun..6=Sat. We display Mon-first, so map onto our
/// DAYS array.
function weekdayIndex(date: Date): number {
  const sundayFirst = date.getDay();
  return (sundayFirst + 6) % 7;
}

function intensityLabel(intensity: number | undefined): string {
  if (!intensity) return 'média';
  if (intensity <= 2) return 'leve';
  if (intensity === 3) return 'média';
  return 'forte';
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', ':');
}

export function Aulas() {
  const today = weekdayIndex(new Date());
  const [day, setDay] = useState(today);
  const dateOffset = (day - today + 7) % 7; // always forward in the week

  const { unit } = useDefaultUnit();
  const { data: slots, isLoading } = useTodayClassSlots(unit?.id, dateOffset);

  const visible = slots ?? [];
  const headlineCount = visible.length;

  return (
    <section id="aulas" className="px-7 pb-[120px] pt-10">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
        <h2
          className="display-tight"
          style={{ fontSize: 'clamp(56px,9vw,140px)', lineHeight: 0.92 }}
        >
          {dateOffset === 0 ? 'Hoje rola' : `${DAYS[day]} rola`}
          <br />
          <span className="font-normal italic text-clay">
            {headlineCount === 0
              ? 'nenhuma aula.'
              : headlineCount === 1
                ? 'uma aula.'
                : `${headlineCount} aulas.`}
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const on = i === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(i)}
                className="rounded-full px-5 py-3 text-sm font-semibold lowercase transition-colors"
                style={{
                  background: on ? 'var(--color-ink)' : 'transparent',
                  color: on ? 'var(--color-cream)' : 'var(--color-ink)',
                  border: on ? '0' : '1.5px solid var(--color-ink)',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t-[1.5px] border-ink">
        {isLoading && (
          <div className="px-3 py-12 text-center text-ink-2">
            Carregando agenda…
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="px-3 py-12 text-center text-ink-2">
            Sem aulas agendadas pra esse dia. Volte amanhã ou{' '}
            <Link to="/cadastro" className="text-clay hover:underline">
              crie sua conta
            </Link>{' '}
            pra ser avisado.
          </div>
        )}
        {visible.map((a) => (
          <SlotRow key={a.id} slot={a} />
        ))}
      </div>
    </section>
  );
}

function SlotRow({ slot }: { slot: PublicClassSlot }) {
  const [hover, setHover] = useState(false);
  const lotada = slot.freeSpots === 0;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);

  return (
    <Link
      to={lotada ? '/cadastro' : '/cadastro'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid grid-cols-[110px_1fr_140px_auto] gap-6 border-b border-sand px-3 py-6 transition-colors lg:grid-cols-[140px_1fr_180px_200px_200px_60px]"
      style={{
        background: hover && !lotada ? 'var(--color-clay)' : 'transparent',
        color: hover && !lotada ? 'var(--color-cream)' : 'var(--color-ink)',
        opacity: lotada ? 0.4 : 1,
        pointerEvents: lotada ? 'none' : 'auto',
        alignItems: 'center',
      }}
    >
      <span className="display-tight" style={{ fontSize: 46, lineHeight: 1 }}>
        {formatHour(slot.startsAt)}
      </span>
      <span
        className="display"
        style={{
          fontSize: 30,
          lineHeight: 1,
          fontStyle: hover ? 'italic' : 'normal',
        }}
      >
        {titulo}
      </span>
      <span className="hidden text-sm font-medium lg:block">
        com {slot.instructor.name.split(' ')[0]}
      </span>
      <span className="hidden text-sm opacity-85 lg:block">
        {slot.durationMinutes} min · pegada {intens}
      </span>
      <span className="text-sm font-semibold">
        {lotada
          ? 'lotada — entrar na fila'
          : `${slot.freeSpots} bike${slot.freeSpots === 1 ? '' : 's'} livre${slot.freeSpots === 1 ? '' : 's'}`}
      </span>
      <span
        className="text-right text-2xl transition-transform"
        style={{ transform: hover ? 'translateX(8px)' : 'none' }}
      >
        {lotada ? '—' : '→'}
      </span>
    </Link>
  );
}
