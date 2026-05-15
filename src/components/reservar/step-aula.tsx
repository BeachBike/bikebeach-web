import { useMemo, useState } from 'react';
import type { FriendAttending } from '@/api/friends';
import type { PublicClassSlot } from '@/api/public';
import {
  FriendBubbleStack,
  FriendsListModal,
} from '@/components/common';
import {
  InstructorPortrait,
  toneFromColorToken,
} from '@/components/common/instructor-portrait';
import { firstName, formatHourMinute, intensityLabel } from '@/lib/format';

const WEEKDAY_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/// Reservations close N minutes before class — kept in sync with the
/// backend's `MIN_RESERVATION_LEAD_MINUTES`.
const MIN_LEAD_MINUTES = 10;

export interface DayOption {
  iso: string; // YYYY-MM-DD start of day in user's TZ
  label: string; // 'seg', 'ter', etc.
  dayNum: string; // '02', '03'...
  isToday: boolean;
}

function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function buildWeekDays(today: Date = new Date()): DayOption[] {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: isoDateKey(d),
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
  /// Map of `classSlotId → { reservationId, canEditBike }` for the user's
  /// active reservations. `canEditBike` is `true` when the class is still
  /// further than the 8h cancellation window — drives the "trocar bike" CTA.
  myReservedSlots: Map<
    string,
    { reservationId: string; canEditBike: boolean }
  >;
  /// 2026-05 — pending waitlist entries by slotId. When set on a slot, the
  /// card renders the "você está na fila" state instead of the lotada CTA.
  myWaitlistBySlot?: Map<string, { entryId: string; position: number }>;
  /// Cancel a reservation directly from the card (only invoked when the
  /// reservation is inside the 8h window — no other action is available).
  onCancelReservation?: (reservationId: string) => void;
  /// Leave the queue from the card.
  onLeaveWaitlist?: (slotId: string) => void;
  isLeavingWaitlist?: boolean;
  isCancellingReservation?: boolean;
  /// G1 — `slotId → friend reservations on that slot`. Populated by the
  /// /reservar route via `useFriendsAttendingBatch` once slots load. Keyed
  /// by slotId; missing entries render no bubble.
  friendsBySlot?: Record<string, FriendAttending[]>;
}

export function StepAula({
  days,
  selectedDay,
  onSelectDay,
  slots,
  isLoading,
  selectedSlotId,
  onSelectSlot,
  myReservedSlots,
  myWaitlistBySlot,
  onCancelReservation,
  onLeaveWaitlist,
  isLeavingWaitlist,
  isCancellingReservation,
  friendsBySlot,
}: Props) {
  // Modal state for the "+N" overflow chip. Single shared state — only
  // one slot's modal is ever open at a time.
  const [openModalSlotId, setOpenModalSlotId] = useState<string | null>(
    null,
  );
  const modalFriends = useMemo(() => {
    if (!openModalSlotId) return [];
    return friendsBySlot?.[openModalSlotId] ?? [];
  }, [openModalSlotId, friendsBySlot]);
  const visible = (slots ?? []).filter((s) => {
    // The endpoint already filters to the same day; defensive trim.
    const d = new Date(s.startsAt);
    return isoDateKey(d) === selectedDay;
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
        {visible.map((s, idx) => {
          const mine = myReservedSlots.get(s.id) ?? null;
          const queue = myWaitlistBySlot?.get(s.id) ?? null;
          const friends = friendsBySlot?.[s.id] ?? [];
          return (
            <SlotRow
              key={s.id}
              slot={s}
              selected={selectedSlotId === s.id}
              mine={mine}
              queue={queue}
              friends={friends}
              index={idx}
              onSelect={onSelectSlot}
              onOpenFriendsList={() => setOpenModalSlotId(s.id)}
              onCancelReservation={onCancelReservation}
              onLeaveWaitlist={onLeaveWaitlist}
              isLeavingWaitlist={!!isLeavingWaitlist}
              isCancellingReservation={!!isCancellingReservation}
            />
          );
        })}
      </div>

      <FriendsListModal
        open={!!openModalSlotId}
        onClose={() => setOpenModalSlotId(null)}
        friends={modalFriends}
      />
    </div>
  );
}

function SlotRow({
  slot,
  selected,
  mine,
  queue,
  friends,
  index,
  onSelect,
  onOpenFriendsList,
  onCancelReservation,
  onLeaveWaitlist,
  isLeavingWaitlist,
  isCancellingReservation,
}: {
  slot: PublicClassSlot;
  selected: boolean;
  mine: { reservationId: string; canEditBike: boolean } | null;
  queue: { entryId: string; position: number } | null;
  friends: FriendAttending[];
  index: number;
  onSelect: (slot: PublicClassSlot) => void;
  onOpenFriendsList: () => void;
  onCancelReservation?: (reservationId: string) => void;
  onLeaveWaitlist?: (slotId: string) => void;
  isLeavingWaitlist: boolean;
  isCancellingReservation: boolean;
}) {
  const startMs = new Date(slot.startsAt).getTime();
  const now = Date.now();
  const minutesToStart = (startMs - now) / 60_000;
  const past = minutesToStart <= 0;
  const tooSoon = !past && minutesToStart < MIN_LEAD_MINUTES;
  const unavailable = past || tooSoon;
  const lotada = slot.freeSpots === 0;
  const baixa = slot.freeSpots > 0 && slot.freeSpots <= 5;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);
  // Three "special" states show a static card with an inline action instead
  // of being clickable as a whole. Standard cards remain clickable buttons.
  const lockedReservation = !!mine && !mine.canEditBike;
  const onWaitlist = !!queue && !mine;
  const useStaticCard = lockedReservation || onWaitlist;
  const disabled = unavailable || useStaticCard;

  const accentColor = lockedReservation
    ? 'var(--color-sun)'
    : onWaitlist
      ? 'var(--color-sea)'
      : null;
  const accentBg = lockedReservation
    ? 'rgba(242,166,90,0.08)'
    : onWaitlist
      ? 'rgba(45,106,106,0.08)'
      : null;

  const Wrapper = useStaticCard ? 'div' : 'button';

  return (
    <Wrapper
      {...(useStaticCard
        ? {}
        : {
            type: 'button' as const,
            onClick: () => !disabled && onSelect(slot),
            disabled,
          })}
      className="grid items-center gap-4 overflow-hidden rounded-2xl border-[1.5px] px-5 py-5 text-left transition-all"
      style={{
        gridTemplateColumns: '96px 1fr auto auto',
        borderColor:
          accentColor ??
          (selected ? 'var(--color-ink)' : 'var(--color-sand)'),
        background:
          accentBg ??
          (selected
            ? 'var(--color-cream-2)'
            : unavailable
              ? '#EFE7D6'
              : 'var(--color-cream)'),
        animation: `fadeup .5s cubic-bezier(.2,.7,.2,1) ${idx2delay(index)}s both`,
        opacity: unavailable && !useStaticCard ? 0.65 : 1,
        cursor: useStaticCard
          ? 'default'
          : disabled
            ? 'not-allowed'
            : 'pointer',
      }}
    >
      <div
        className="display-tight mono"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: selected
            ? 'var(--color-clay)'
            : unavailable
              ? 'var(--color-ink-2)'
              : 'var(--color-ink)',
        }}
      >
        {formatHourMinute(slot.startsAt)}
      </div>

      <div>
        <div
          className="display-tight flex flex-wrap items-center gap-3"
          style={{
            fontSize: 24,
            lineHeight: 1.05,
            color: unavailable ? 'var(--color-ink-2)' : 'inherit',
          }}
        >
          <span>{titulo}</span>
          {friends.length > 0 && (
            <span
              className="inline-flex items-center"
              onClick={(e) => {
                // Don't bubble up to the SlotRow's onSelect — opening the
                // overflow modal shouldn't accidentally pick the slot.
                e.stopPropagation();
              }}
            >
              <FriendBubbleStack
                friends={friends.map((f) => ({
                  userId: f.userId,
                  name: f.name,
                  isWaitlisted: f.isWaitlisted,
                }))}
                max={3}
                size="sm"
                ringColor={
                  selected
                    ? 'var(--color-cream-2)'
                    : 'var(--color-cream)'
                }
                onOverflowClick={onOpenFriendsList}
              />
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-2">
            <InstructorPortrait
              photoUrl={slot.instructor.photoUrl}
              name={slot.instructor.name}
              tone={toneFromColorToken(slot.classKind?.colorToken)}
              size="xs"
            />
            com {firstName(slot.instructor.name)}
          </span>
          <span>·</span>
          <span>{slot.durationMinutes} min</span>
          <span>·</span>
          <span>pegada {intens}</span>
          <span>·</span>
          <span className="font-semibold text-ink">
            {slot.unit.name.toLowerCase()}
          </span>
          {mine && (
            <>
              <span>·</span>
              <span
                className="font-semibold"
                style={{
                  color: mine.canEditBike
                    ? 'var(--color-clay)'
                    : 'var(--color-sun)',
                }}
              >
                {mine.canEditBike
                  ? 'você está reservada · trocar bike →'
                  : 'você está reservada · só dá pra cancelar'}
              </span>
            </>
          )}
          {onWaitlist && queue && (
            <>
              <span>·</span>
              <span
                className="font-semibold"
                style={{ color: 'var(--color-sea)' }}
              >
                {queue.position}º na fila · 
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {lockedReservation && mine ? (
          // Reservation already exists AND inside the 8h window. The card
          // is otherwise locked — only action is the (lossy) cancel.
          <button
            type="button"
            disabled={isCancellingReservation}
            onClick={(e) => {
              e.stopPropagation();
              onCancelReservation?.(mine.reservationId);
            }}
            className="rounded-full bg-clay-d/15 px-4 py-2 text-[12px] font-bold text-clay-d transition-colors hover:bg-clay-d hover:text-cream disabled:opacity-50"
          >
            {isCancellingReservation ? 'cancelando…' : 'cancelar (perde crédito)'}
          </button>
        ) : onWaitlist && queue ? (
          // Already waiting in line — the seat-selection flow doesn't
          // apply. Offer a refund-safe leave instead.
          <button
            type="button"
            disabled={isLeavingWaitlist}
            onClick={(e) => {
              e.stopPropagation();
              onLeaveWaitlist?.(slot.id);
            }}
            className="rounded-full border-[1.5px] border-sea px-4 py-2 text-[12px] font-bold text-sea-d transition-colors hover:bg-sea hover:text-cream disabled:opacity-50"
          >
            {isLeavingWaitlist ? 'saindo…' : 'sair da fila'}
          </button>
        ) : past ? (
          <span
            className="display-tight mono text-ink-2"
            style={{ fontSize: 16 }}
          >
            já passou
          </span>
        ) : tooSoon ? (
          <>
            <span
              className="display-tight mono text-ink-2"
              style={{ fontSize: 18 }}
            >
              indisponível
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              fecha {MIN_LEAD_MINUTES}min antes
            </span>
          </>
        ) : lotada ? (
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
          color: selected
            ? 'var(--color-cream)'
            : unavailable
              ? 'var(--color-ink-2)'
              : 'var(--color-ink-2)',
        }}
      >
        {selected ? '✓' : unavailable ? '·' : '→'}
      </div>
    </Wrapper>
  );
}

function idx2delay(i: number): number {
  return Math.min(i, 8) * 0.06;
}
