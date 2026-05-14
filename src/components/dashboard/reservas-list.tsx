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
  // Promoted-from-waitlist reservations enjoy a 2h protected cancellation
  // window (CLAUDE.md product rules). Standard reservations follow the 8h
  // rule. Anything outside the applicable window means the user still can
  // cancel but loses the credit.
  const cancelWindowHours = promoted ? 2 : 8;
  const cancelFree = hoursToClass >= cancelWindowHours;

  return (
    <div
      className={`grid grid-cols-1 items-center gap-3.5 rounded-2xl border bg-cream px-5 py-4 lg:grid-cols-[110px_1fr_140px_minmax(120px,auto)_auto] ${
        canEditBike ? 'border-sand' : 'border-sun/60'
      }`}
    >
      <div className="flex flex-col">
        <span
          className="display-tight"
          style={{ fontSize: 22, lineHeight: 1 }}
        >
          {relativeDayLabel(slot.startsAt)}
        </span>
        <span className="mt-0.5 text-[13px] text-ink-2">
          {formatDayMonth(slot.startsAt)} · {formatHourMinute(slot.startsAt)}
        </span>
      </div>
      <div className="flex flex-col">
        <span
          className="display-tight"
          style={{ fontSize: 22, lineHeight: 1.1 }}
        >
          {titulo}
        </span>
        <span className="mt-1 text-[13px] text-ink-2">
          com {firstName(slot.instructor.name)} · bike {r.bike.label}
        </span>
      </div>
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{
          color: promoted ? 'var(--color-sun)' : 'var(--color-sea)',
        }}
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
        // Single, quiet hint instead of a separate chip + sentence — keeps
        // the desktop row scannable when most reservations are inside the
        // 8h window.
        <span className="text-[11px] leading-tight text-ink-3">
          fora da janela de troca
        </span>
      )}
      <button
        type="button"
        disabled={cancelling}
        onClick={() => onCancel(r)}
        className={`rounded-full px-3 py-2.5 text-[12px] font-bold transition-colors disabled:opacity-50 ${
          cancelFree
            ? 'text-ink-2 hover:bg-cream-2 hover:text-clay-d'
            : 'bg-clay-d/10 text-clay-d hover:bg-clay-d hover:text-cream'
        }`}
        title={
          cancelFree
            ? 'Cancelar sem custo — crédito volta pra carteira.'
            : 'Cancelar agora consome o crédito da reserva.'
        }
      >
        {cancelling
          ? 'cancelando…'
          : cancelFree
            ? 'cancelar'
            : 'cancelar (perde crédito)'}
      </button>
    </div>
  );
}
