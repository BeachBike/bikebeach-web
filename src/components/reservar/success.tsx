import type { PublicBike, SeatMap } from '@/api/public';
import { formatHourMinute, relativeDayLabel } from '@/lib/format';

interface Props {
  seatMap: SeatMap;
  bike: PublicBike;
  /// When the success screen renders after PATCH /bike (edit-bike flow)
  /// instead of POST /reservations, swap the headline copy so the user
  /// understands the bike was swapped, not double-booked.
  editMode?: boolean;
}

/// Final ceremony — pulsing checkmark + bike id + auto-redirect message.
export function ReservationSuccess({ seatMap, bike, editMode }: Props) {
  const slot = seatMap.slot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const dia = relativeDayLabel(slot.startsAt);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      style={{ animation: 'fadeup .5s cubic-bezier(.2,.7,.2,1) both' }}
    >
      <div
        className="mb-8 grid h-[120px] w-[120px] place-items-center rounded-full"
        style={{
          background:
            'radial-gradient(circle, var(--color-sun) 0%, var(--color-clay) 100%)',
          boxShadow: '0 30px 60px -20px rgba(216,93,52,.5)',
          animation: 'pulseSel 1.5s ease-out infinite',
        }}
      >
        <span className="text-6xl text-cream">✓</span>
      </div>
      <div
        className="display-tight"
        style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.95 }}
      >
        {editMode ? 'bike trocada.' : 'tá reservado.'}
      </div>
      <p className="mt-3.5 max-w-[420px] text-base text-ink-2">
        {titulo} · {dia} · {formatHourMinute(slot.startsAt)} · bike{' '}
        <b>{bike.label}</b> · arena <b>{slot.unit.name.toLowerCase()}</b>.
        chega 10 min antes.
      </p>
      <p className="mt-6 text-[13px] text-ink-3">
        levando você de volta ao painel…
      </p>
    </div>
  );
}
