import { Link } from 'react-router';
import type { Reservation } from '@/api/me';
import {
  formatDayMonth,
  formatHourMinute,
  relativeDayLabel,
} from '@/lib/format';

interface Props {
  reservations: Reservation[] | undefined;
  onCancel: (reservationId: string) => void;
  cancellingId: string | null;
  /// When set, hide the hero/next reservation row (it's already shown in
  /// NextClass on the início tab).
  hideId?: string;
}

/// Upcoming + waitlisted reservations list. Past + cancelled reservations
/// belong in Histórico.
export function ReservasList({
  reservations,
  onCancel,
  cancellingId,
  hideId,
}: Props) {
  const now = new Date();
  const upcoming = (reservations ?? [])
    .filter(
      (r) =>
        (r.status === 'ACTIVE' || r.status === 'CHECKED_IN') &&
        new Date(r.classSlot.startsAt) > now &&
        r.id !== hideId,
    )
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    );

  return (
    <section className="col-span-12 mt-5">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2.5">
        <h2
          className="display-tight"
          style={{ fontSize: 'clamp(28px,5vw,36px)' }}
        >
          minhas próximas aulas
        </h2>
        <Link
          to="/reservar"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay"
        >
          + reservar mais
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-cream/50 px-6 py-10 text-center text-sm text-ink-2">
          nenhuma aula reservada no momento.{' '}
          <Link to="/reservar" className="font-semibold text-clay hover:underline">
            ver horários
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((r) => (
            <ReservaRow
              key={r.id}
              r={r}
              onCancel={onCancel}
              cancelling={cancellingId === r.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReservaRow({
  r,
  onCancel,
  cancelling,
}: {
  r: Reservation;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const slot = r.classSlot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const promoted = r.promotedFromWaitlist;
  const waitlistTag = promoted ? 'promovido' : null;

  return (
    <div className="grid grid-cols-1 items-center gap-3.5 rounded-2xl border border-sand bg-cream px-5 py-4 lg:grid-cols-[110px_1fr_130px_130px_110px_100px]">
      <div className="flex flex-col">
        <span
          className="display-tight"
          style={{ fontSize: 22, lineHeight: 1 }}
        >
          {relativeDayLabel(slot.startsAt)}
        </span>
        <span className="mt-0.5 text-[13px] text-ink-2">
          {formatDayMonth(slot.startsAt)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-clay">
          {formatHourMinute(slot.startsAt)}
        </span>
        <span
          className="display-tight mt-0.5"
          style={{ fontSize: 24, lineHeight: 1.1 }}
        >
          {titulo}
        </span>
      </div>
      <span className="text-sm font-medium">
        com {slot.instructor.name.split(' ')[0]?.toLowerCase()}
      </span>
      <span className="w-fit rounded-full bg-cream-2 px-3 py-1.5 text-[13px] font-semibold">
        bike {r.bike.label}
      </span>
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{
          color: waitlistTag ? 'var(--color-sun)' : 'var(--color-sea)',
        }}
      >
        {waitlistTag ?? 'confirmada'}
      </span>
      <button
        type="button"
        disabled={cancelling}
        onClick={() => onCancel(r.id)}
        className="rounded-full px-3 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2 hover:text-clay-d disabled:opacity-50"
      >
        {cancelling ? 'cancelando…' : 'cancelar'}
      </button>
    </div>
  );
}
