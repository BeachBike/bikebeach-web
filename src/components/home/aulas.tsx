import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  useTodayClassSlots,
  type PublicClassSlot,
} from '@/api/public';
import { useRoleHome } from '@/hooks/useRoleHome';
import { intensityLabel } from '@/lib/format';
import { ALL_ARENAS, useArenaStore } from '@/stores/arena';

const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

/// JS getDay() returns 0=Sun..6=Sat. We display Mon-first, so map onto our
/// DAYS array.
function weekdayIndex(date: Date): number {
  const sundayFirst = date.getDay();
  return (sundayFirst + 6) % 7;
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', ':');
}

/// Rolling 10-day window relative to today: 2 days back + today + 7 ahead.
/// Day offsets (not weekday indexes) so the strip never wraps the week
/// and naturally rolls forward each calendar day.
const DAY_OFFSETS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7] as const;

/// Short chip label. Nearby days get relative words; the rest fall back to
/// "weekday day-of-month" so repeated weekdays across the 10-day window
/// stay distinguishable (e.g. two "ter"s become "ter 12" / "ter 19").
function chipLabel(offset: number, date: Date): string {
  if (offset === 0) return 'hoje';
  if (offset === -1) return 'ontem';
  if (offset === 1) return 'amanhã';
  return `${DAYS[weekdayIndex(date)]} ${date.getDate()}`;
}

export function Aulas() {
  const [offset, setOffset] = useState(0); // default: today

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return DAY_OFFSETS.map((o) => {
      const date = new Date(base);
      date.setDate(date.getDate() + o);
      return { offset: o, date };
    });
  }, []);
  const selDate =
    days.find((d) => d.offset === offset)?.date ?? new Date();

  const arena = useArenaStore((s) => s.selectedArenaId);
  const isAll = arena === ALL_ARENAS;
  const { data: slots, isLoading } = useTodayClassSlots(arena, offset);

  // D2 / item 3 — cap to 6 entries per day; the headline still mentions the
  // full count of the day so visitors know there's more.
  const all = slots ?? [];
  const headlineCount = all.length;
  const visible = all.slice(0, 6);
  const overflow = Math.max(0, headlineCount - visible.length);

  const headline =
    offset === 0
      ? 'Hoje rola'
      : offset < 0
        ? `${chipLabel(offset, selDate)} rolou`
        : `${chipLabel(offset, selDate)} rola`;

  return (
    <section id="aulas" className="px-7 pb-20 pt-10 sm:pb-[120px]">
      {/* Deterministic header layout. The old `flex flex-wrap
          justify-between` let the day strip hop between "beside the
          headline" and "below it" depending on the headline's text
          width — which changes per day + when the count loads. On some
          days that width straddled the wrap threshold and the strip
          oscillated up/down. Now: stacked (strip always below) until
          lg, then a no-wrap row so it can't oscillate. */}
      <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:flex-nowrap lg:items-end lg:justify-between">
        <h2
          className="display-tight lg:min-w-0"
          style={{ fontSize: 'clamp(34px,9vw,140px)', lineHeight: 0.92 }}
        >
          {headline}
          <br />
          <span className="font-normal italic text-clay">
            {headlineCount === 0
              ? 'nenhuma aula.'
              : headlineCount === 1
                ? 'uma aula.'
                : `${headlineCount} aulas.`}
          </span>
        </h2>
        <div className="flex shrink-0 flex-wrap gap-2">
          {days.map(({ offset: o, date }) => {
            const on = o === offset;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold lowercase transition-colors"
                style={{
                  background: on ? 'var(--color-ink)' : 'transparent',
                  color: on ? 'var(--color-cream)' : 'var(--color-ink)',
                  border: on ? '0' : '1.5px solid var(--color-ink)',
                }}
              >
                {chipLabel(o, date)}
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
          <SlotRow key={a.id} slot={a} showArena={isAll} />
        ))}
      </div>

      {overflow > 0 && (
        <div className="mt-8 flex justify-center">
          <Link
            to="/reservar"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            ver mais {overflow} aula{overflow === 1 ? '' : 's'} →
          </Link>
        </div>
      )}
    </section>
  );
}

function SlotRow({
  slot,
  showArena,
}: {
  slot: PublicClassSlot;
  showArena: boolean;
}) {
  const [hover, setHover] = useState(false);
  const lotada = slot.freeSpots === 0;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);
  const home = useRoleHome();
  // Logged users go to /reservar (deep-linking comes later in E2). Public
  // visitors land on /cadastro to start the funnel.
  const target = home ? '/reservar' : '/cadastro';

  const firstInstructor = slot.instructor.name.split(' ')[0];
  const freeLabel = lotada
    ? 'lotada'
    : `${slot.freeSpots} livre${slot.freeSpots === 1 ? '' : 's'}`;

  return (
    <>
      {/* Mobile card — stacked, no fixed-px grid (the old desktop grid
          overflowed the viewport on phones). One tap target. */}
      <Link
        to={target}
        className="flex flex-col gap-2 border-b border-sand px-1 py-5 lg:hidden"
        style={{
          opacity: lotada ? 0.45 : 1,
          pointerEvents: lotada ? 'none' : 'auto',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="display-tight"
            style={{ fontSize: 30, lineHeight: 1 }}
          >
            {formatHour(slot.startsAt)}
          </span>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{
              background: lotada
                ? 'var(--color-sand)'
                : 'var(--color-cream-2)',
              color: 'var(--color-ink-2)',
            }}
          >
            {freeLabel}
          </span>
        </div>
        <div
          className="display"
          style={{ fontSize: 'clamp(22px,6.5vw,30px)', lineHeight: 1.05 }}
        >
          {titulo}
        </div>
        <div className="text-[13px] leading-snug text-ink-2">
          com {firstInstructor} · {slot.durationMinutes}min · pegada{' '}
          {intens}
          {showArena && ` · ${slot.unit.name.toLowerCase()}`}
        </div>
      </Link>

      {/* Desktop row — unchanged 6-col layout, just gated to lg+. */}
      <Link
        to={target}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="hidden gap-6 border-b border-sand px-3 py-6 transition-colors lg:grid lg:grid-cols-[140px_1fr_180px_200px_200px_60px]"
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
          className="display flex flex-col gap-1"
          style={{
            fontSize: 30,
            lineHeight: 1,
            fontStyle: hover ? 'italic' : 'normal',
          }}
        >
          {titulo}
          {showArena && (
            <span
              className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase not-italic tracking-wider"
              style={{
                background: hover && !lotada ? 'rgba(255,255,255,0.15)' : 'var(--color-cream-2)',
                color: hover && !lotada ? 'var(--color-cream)' : 'var(--color-ink-2)',
              }}
            >
              {slot.unit.name.toLowerCase()}
            </span>
          )}
        </span>
        <span className="text-sm font-medium">
          com {firstInstructor}
        </span>
        <span className="text-sm opacity-85">
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
    </>
  );
}
