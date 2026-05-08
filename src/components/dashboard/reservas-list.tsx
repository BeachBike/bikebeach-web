import { Link } from 'react-router';
import type { Reservation } from '@/api/me';
import { Pagination, usePagination } from '@/components/common';
import {
  firstName,
  formatDayMonth,
  formatHourMinute,
  relativeDayLabel,
} from '@/lib/format';

interface Props {
  reservations: Reservation[] | undefined;
  /// Caller decides which modal to open (Confirm vs DoubleConsent) — the
  /// row just delegates the click. See `DashboardRoute.requestCancel`.
  onCancel: (reservation: Reservation) => void;
  cancellingId: string | null;
  /// When set, hide the hero/next reservation row (it's already shown in
  /// NextClass on the início tab).
  hideId?: string;
}

/// Upcoming + waitlisted reservations list. Cancelled classes (by studio
/// or user) do NOT appear here — they live in histórico.
export function ReservasList({
  reservations,
  onCancel,
  cancellingId,
  hideId,
}: Props) {
  const upcoming = (reservations ?? [])
    .filter((r) => {
      if (r.id === hideId) return false;
      if (r.status !== 'ACTIVE' && r.status !== 'CHECKED_IN') return false;
      return new Date(r.classSlot.startsAt).getTime() > Date.now();
    })
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    );

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } =
    usePagination(upcoming, 6);

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
        <>
          <div className="flex flex-col gap-2.5">
            {pageItems.map((r) => (
              <ReservaRow
                key={r.id}
                r={r}
                onCancel={onCancel}
                cancelling={cancellingId === r.id}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
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
  onCancel: (reservation: Reservation) => void;
  cancelling: boolean;
}) {
  const slot = r.classSlot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const promoted = r.promotedFromWaitlist;
  const hoursToClass =
    (new Date(slot.startsAt).getTime() - Date.now()) / 3_600_000;
  const canEditBike = hoursToClass >= 8;

  return (
    <div
      className="grid grid-cols-1 items-center gap-3.5 rounded-2xl border border-sand bg-cream px-5 py-4 lg:grid-cols-[110px_1fr_130px_130px_minmax(140px,auto)_auto_100px]"
    >
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
        com {firstName(slot.instructor.name)}
      </span>
      <span className="w-fit rounded-full bg-cream-2 px-3 py-1.5 text-[13px] font-semibold">
        bike {r.bike.label}
      </span>
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: promoted ? 'var(--color-sun)' : 'var(--color-sea)' }}
      >
        {promoted ? 'promovido' : 'confirmada'}
      </span>
      {canEditBike ? (
        <Link
          to={`/reservar?edit=${r.id}`}
          className="rounded-full border border-sand px-3 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-cream-2"
        >
          trocar bike
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <button
        type="button"
        disabled={cancelling}
        onClick={() => onCancel(r)}
        className="rounded-full px-3 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2 hover:text-clay-d disabled:opacity-50"
      >
        {cancelling ? 'cancelando…' : 'cancelar'}
      </button>
    </div>
  );
}
