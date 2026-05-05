import type { PublicClassSlot } from '@/api/public';
import { formatHourMinute, intensityLabel } from '@/lib/format';

const WEEKDAY_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export interface DayOption {
  iso: string; // YYYY-MM-DD start of day in user's TZ
  label: string; // 'seg', 'ter', etc.
  dayNum: string; // '02', '03'...
  isToday: boolean;
}

export function buildWeekDays(today: Date = new Date()): DayOption[] {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: WEEKDAY_PT[d.getDay()] ?? '',
      dayNum: String(d.getDate()).padStart(2, '0'),
      isToday: i === 0,
    };
  });
}

interface Props {
  days: DayOption[];
  selectedDay: string; // iso
  onSelectDay: (iso: string) => void;
  slots: PublicClassSlot[] | undefined;
  isLoading: boolean;
  selectedSlotId: string | undefined;
  onSelectSlot: (slot: PublicClassSlot) => void;
  /// IDs of slots the user already has an active reservation for, so we
  /// can render a "já reservada" hint.
  myReservedSlotIds: Set<string>;
}

export function StepAula({
  days,
  selectedDay,
  onSelectDay,
  slots,
  isLoading,
  selectedSlotId,
  onSelectSlot,
  myReservedSlotIds,
}: Props) {
  const visible = (slots ?? []).filter((s) => {
    // The endpoint already filters to the same day; defensive trim.
    const d = new Date(s.startsAt);
    return d.toISOString().slice(0, 10) === selectedDay;
  });

  return (
    <div className="fadeup">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        passo um · de três
      </div>
      <h2
        className="display-tight mt-3"
        style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.92 }}
      >
        que horas
        <br />
        <span className="font-normal italic text-clay">te chama hoje?</span>
      </h2>

      {/* day picker — horizontal scroll on mobile */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d) => {
          const on = d.iso === selectedDay;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onSelectDay(d.iso)}
              className="flex min-w-[84px] flex-col items-center gap-1 rounded-2xl border-[1.5px] px-5 py-3.5 text-[13px] font-semibold transition-all"
              style={{
                background: on ? 'var(--color-ink)' : 'var(--color-cream-2)',
                color: on ? 'var(--color-cream)' : 'var(--color-ink)',
                borderColor: on ? 'var(--color-ink)' : 'transparent',
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                {d.label}
              </span>
              <span
                className="display-tight"
                style={{ fontSize: 26 }}
              >
                {d.dayNum}
              </span>
              {d.isToday && (
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: on ? 'var(--color-sun)' : 'var(--color-clay)',
                  }}
                >
                  hoje
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        {isLoading && (
          <div className="rounded-2xl bg-cream-2 px-5 py-12 text-center text-[15px] text-ink-2">
            carregando agenda…
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="rounded-2xl bg-cream-2 px-5 py-12 text-center text-[15px] text-ink-2">
            sem aulas nesse dia. tenta outro!
          </div>
        )}
        {visible.map((s, idx) => (
          <SlotRow
            key={s.id}
            slot={s}
            selected={selectedSlotId === s.id}
            already={myReservedSlotIds.has(s.id)}
            index={idx}
            onSelect={onSelectSlot}
          />
        ))}
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  selected,
  already,
  index,
  onSelect,
}: {
  slot: PublicClassSlot;
  selected: boolean;
  already: boolean;
  index: number;
  onSelect: (slot: PublicClassSlot) => void;
}) {
  const lotada = slot.freeSpots === 0;
  const baixa = slot.freeSpots > 0 && slot.freeSpots <= 5;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className="grid items-center gap-4 overflow-hidden rounded-2xl border-[1.5px] px-5 py-5 text-left transition-all"
      style={{
        gridTemplateColumns: '96px 1fr auto auto',
        borderColor: selected ? 'var(--color-ink)' : 'var(--color-sand)',
        background: selected
          ? 'var(--color-cream-2)'
          : 'var(--color-cream)',
        animation: `fadeup .5s cubic-bezier(.2,.7,.2,1) ${idx2delay(index)}s both`,
      }}
    >
      <div
        className="display-tight mono"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: selected ? 'var(--color-clay)' : 'var(--color-ink)',
        }}
      >
        {formatHourMinute(slot.startsAt)}
      </div>

      <div>
        <div
          className="display-tight"
          style={{ fontSize: 24, lineHeight: 1.05 }}
        >
          {titulo}
        </div>
        <div className="mt-1 flex flex-wrap gap-2.5 text-[13px] text-ink-2">
          <span>com {slot.instructor.name.split(' ')[0]?.toLowerCase()}</span>
          <span>·</span>
          <span>{slot.durationMinutes} min</span>
          <span>·</span>
          <span>pegada {intens}</span>
          {already && (
            <>
              <span>·</span>
              <span className="font-semibold text-clay">
                você já tem reserva
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {lotada ? (
          <>
            <span
              className="display-tight mono text-ink-2"
              style={{ fontSize: 20 }}
            >
              lotada
            </span>
            <span className="text-[11px] font-semibold text-clay">
              entrar na espera
            </span>
          </>
        ) : (
          <>
            <span
              className="display-tight mono"
              style={{
                fontSize: 20,
                color: baixa ? 'var(--color-clay)' : 'var(--color-ink)',
              }}
            >
              {slot.freeSpots}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              {baixa ? 'últimas bikes' : 'bikes livres'}
            </span>
          </>
        )}
      </div>

      <div
        className="grid h-9 w-9 place-items-center rounded-full text-base transition-all"
        style={{
          background: selected ? 'var(--color-clay)' : 'transparent',
          border: selected ? '0' : '1.5px solid var(--color-sand)',
          color: selected ? 'var(--color-cream)' : 'var(--color-ink-2)',
        }}
      >
        {selected ? '✓' : '→'}
      </div>
    </button>
  );
}

function idx2delay(i: number): number {
  return Math.min(i, 8) * 0.06;
}
