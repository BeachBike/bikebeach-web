import { useMemo } from 'react';
import {
  isInstructorMarkedNoShow,
  useToggleCheckIn,
  type RosterStudent,
  type SlotRoster,
} from '@/api/professor';
import type { PublicBike, SeatMap } from '@/api/public';
import { firstName } from '@/lib/format';

interface Props {
  slotId: string;
  seatMap: SeatMap;
  roster: SlotRoster;
}

/// AO VIVO arena map. Mirrors the client bike picker (`reservar/step-bike.tsx`)
/// so instructor and student see the same arena: ocean on top, palco directly
/// below, then the bike grid.
///
/// **Attendance model (2026-05): presença é o padrão.** Every bike with a
/// reservation renders as *presente* (green). The professor's only job is to
/// tap the ones who **didn't show** — that flips them to ausência. There is
/// no "reservado/pendente" tint anymore: not-yet-checked-in and checked-in
/// look identical, because both are treated as present on finalize.
///
/// Status mapping per bike:
///   - empty (no reservation)        → cream, no tap
///   - ACTIVE / CHECKED_IN / COMPLETED → green "presente"; tap → ausência
///   - NO_SHOW (instructor-marked)   → muted "ausência"; tap → volta a presente
///   - NO_SHOW (self-marked)         → muted "ausência (aluno)", **bloqueada**
///   - MAINTENANCE / OUT_OF_SERVICE  → hatched, never tappable
///
/// Mobile: an 8-wide arena never fits a phone with comfortable tap targets,
/// so the grid lives in a horizontal-scroll container with a min width that
/// keeps each bike ≥ ~54px. On desktop it just fills the card.
export function ArenaMap({ slotId, seatMap, roster }: Props) {
  const toggle = useToggleCheckIn();

  // Index reservations by bikeLabel so the grid can answer "who's on this
  // bike" in O(1). The roster only carries live reservations (cancelled
  // rows are filtered server-side).
  const byLabel = useMemo(() => {
    const m = new Map<string, RosterStudent>();
    for (const s of roster.students) m.set(s.bikeLabel, s);
    return m;
  }, [roster.students]);

  const rows = seatMap.unit.maxRows;
  const cols = seatMap.unit.maxCols;

  // Position bikes by (row, col). Bikes without coordinates (legacy data)
  // go to a "soltas" footer so they stay reachable for check-in.
  const byPos = new Map<string, PublicBike>();
  const loose: PublicBike[] = [];
  for (const b of seatMap.bikes) {
    if (b.row && b.col != null) byPos.set(`${b.row}:${b.col}`, b);
    else loose.push(b);
  }

  // Min width that keeps every column ≥ ~54px — drives the mobile scroll.
  const minGridWidth = cols * 54 + (cols - 1) * 8;

  const tapBike = (student: RosterStudent | undefined, shownPresent: boolean) => {
    if (!student) return;
    // Present → tap marks absent (`present: false`). Absent → tap brings
    // them back (`present: true`). The backend owns the exact target
    // status (NO_SHOW vs ACTIVE pre-start) — we just send the intent.
    toggle.mutate({
      slotId,
      reservationId: student.reservationId,
      present: !shownPresent,
    });
  };

  return (
    <section className="rounded-[20px] border border-sand bg-cream p-3.5 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[.18em] text-clay">
          mapa ao vivo
        </span>
        <Legend />
      </div>
      <p className="mb-3 text-[12px] text-ink-2">
        Todo mundo entra como <b>presente</b>. Toque só nas bikes de quem{' '}
        <b>faltou</b> pra marcar ausência.
      </p>

      {/* Scroll viewport — on a phone the arena is wider than the screen. */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: minGridWidth }}>
          {/* Ocean + Palco — espelha produção; instrutor de costas pro mar,
              bikes "olhando" pro palco. */}
          <div
            className="rounded-md py-1 text-center text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: 'linear-gradient(180deg, #b8e2dc 0%, #6fc0b1 100%)',
              color: 'var(--color-ink)',
            }}
          >
            ~ oceano ~
          </div>
          <div
            className="mt-1.5 rounded-md py-1 text-center text-[10px] font-bold uppercase tracking-widest text-cream"
            style={{ background: 'var(--color-ink)' }}
          >
            ▼ palco · instrutor ▼
          </div>

          {/* Grid de bikes */}
          <div
            className="mt-2 grid gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
            }}
          >
            {Array.from({ length: rows * cols }, (_, i) => {
              const row = String.fromCharCode(65 + Math.floor(i / cols));
              const col = (i % cols) + 1;
              const bike = byPos.get(`${row}:${col}`);
              if (!bike) {
                // Posição vazia (arena menor que maxRows×maxCols).
                return <div key={i} aria-hidden />;
              }
              return (
                <BikeCell
                  key={bike.id}
                  bike={bike}
                  student={byLabel.get(bike.label)}
                  busy={toggle.isPending}
                  onTap={tapBike}
                />
              );
            })}
          </div>
        </div>
      </div>

      {loose.length > 0 && (
        <div className="mt-4 border-t border-sand pt-3">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-3">
            bikes sem posição
          </div>
          <div className="flex flex-wrap gap-2">
            {loose.map((b) => (
              <BikeCell
                key={b.id}
                bike={b}
                student={byLabel.get(b.label)}
                busy={toggle.isPending}
                onTap={tapBike}
                variant="loose"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BikeCell({
  bike,
  student,
  busy,
  onTap,
  variant,
}: {
  bike: PublicBike;
  student: RosterStudent | undefined;
  busy: boolean;
  onTap: (student: RosterStudent | undefined, shownPresent: boolean) => void;
  variant?: 'loose';
}) {
  const isOperational = bike.status === 'OPERATIONAL';
  const status = student?.status;
  const isAbsent = status === 'NO_SHOW';
  // Presença é o padrão: qualquer reserva que não seja NO_SHOW = presente.
  const shownPresent = !!student && !isAbsent;
  // Self-marked NO_SHOW is sacred — the professor can't override the
  // student's own justification.
  const blocked = !!student && isAbsent && !isInstructorMarkedNoShow(student);
  const tappable = !!student && isOperational && !blocked && !busy;

  const bg = !isOperational
    ? 'rgba(110, 97, 79, 0.18)'
    : !student
      ? 'var(--color-cream-2)'
      : isAbsent
        ? 'rgba(181, 67, 31, 0.16)'
        : 'var(--color-success)';
  const fg =
    !student || isAbsent || !isOperational
      ? 'var(--color-ink-2)'
      : 'var(--color-cream)';

  const sub = !isOperational
    ? bike.status === 'MAINTENANCE'
      ? 'manut.'
      : 'parada'
    : !student
      ? 'vazia'
      : isAbsent
        ? blocked
          ? 'ausência (aluno)'
          : 'ausência'
        : 'presente';

  const aria = student
    ? `${bike.label} · ${student.user.name}${student.promotedFromWaitlist ? ' (promovido)' : ''} · ${sub}`
    : `${bike.label} · ${sub}`;

  const inner = (
    <>
      <div className="mono text-[12px] font-bold leading-none sm:text-[14px]">
        {bike.label}
      </div>
      {student && (
        <div className="mt-1 line-clamp-1 px-1 text-[9px] font-semibold uppercase tracking-wide opacity-90 sm:text-[10px]">
          {firstName(student.user.name).toLowerCase()}
        </div>
      )}
      <div className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-widest opacity-75 sm:text-[9px]">
        {sub}
      </div>
      {student?.promotedFromWaitlist && (
        <div
          className="absolute right-1 top-1 grid h-3 w-3 place-items-center rounded-full text-[7px] font-bold"
          style={{
            background: 'var(--color-sun)',
            color: 'var(--color-ink)',
          }}
          title="Promovido da fila"
          aria-hidden
        >
          P
        </div>
      )}
      {!isOperational && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(74,63,53,.12) 0 6px, transparent 6px 12px)',
          }}
        />
      )}
    </>
  );

  const className =
    'relative grid place-items-center rounded-md text-center transition-transform duration-150 ' +
    (variant === 'loose' ? 'h-16 w-16' : 'aspect-square min-h-[54px]');

  if (!tappable) {
    return (
      <div
        className={className + ' cursor-default'}
        style={{ background: bg, color: fg, opacity: blocked ? 0.85 : 1 }}
        aria-label={aria}
        title={
          blocked
            ? 'Aluno marcou a própria ausência — não dá pra mudar.'
            : aria
        }
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onTap(student, shownPresent)}
      disabled={busy}
      className={
        className +
        ' cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait'
      }
      style={{ background: bg, color: fg }}
      aria-label={aria}
      title={aria}
    >
      {inner}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-2">
      <Swatch color="var(--color-success)" label="presente" />
      <Swatch color="rgba(181, 67, 31, 0.16)" label="ausência" outline />
      <Swatch color="var(--color-cream-2)" label="vazia" outline />
    </div>
  );
}

function Swatch({
  color,
  label,
  outline,
}: {
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{
          background: color,
          boxShadow: outline ? 'inset 0 0 0 1px var(--color-sand)' : 'none',
        }}
      />
      {label}
    </span>
  );
}
