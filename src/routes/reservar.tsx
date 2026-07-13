import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useFriendsAttendingBatch } from '@/api/friends';
import {
  useCancelReservation,
  useChangeBike,
  useCreateReservation,
  useJoinWaitlist,
  useLeaveWaitlist,
  useMe,
  useMyCreditPacks,
  useMyReservations,
  useMyWaitlists,
} from '@/api/me';
import {
  acquireBikeHold,
  getMyBikeHold,
  releaseBikeHold,
  useClassSlotsRange,
  useSeatMap,
  type PublicBike,
  type PublicClassSlot,
} from '@/api/public';
import { useHealthGateStatus } from '@/api/health-gate';
import {
  ConfirmModal,
  DoubleConsentModal,
  HealthGateBanner,
} from '@/components/common';
import { Intro } from '@/components/reservar/intro';
import { StepAula, buildWeekDays } from '@/components/reservar/step-aula';
import { StepBike } from '@/components/reservar/step-bike';
import { StepConfirm } from '@/components/reservar/step-confirm';
import { StepsBreadcrumb } from '@/components/reservar/steps-breadcrumb';
import { ReservationSuccess } from '@/components/reservar/success';
import { ReservarTopBar } from '@/components/reservar/top-bar';
import { WaitlistModal } from '@/components/reservar/waitlist-modal';
import { formatHourMinute } from '@/lib/format';
import { useArenaStore } from '@/stores/arena';
import { useAuthStore } from '@/stores/auth';

type Step = -1 | 0 | 1 | 2 | 3; // -1 intro, 0 day, 1 bike, 2 confirm, 3 success

/// Hours window outside which the user can swap bikes on an existing
/// reservation. Mirrors the backend's `STANDARD_CANCELLATION_WINDOW_HOURS`.
const EDIT_BIKE_WINDOW_HOURS = 8;

export function ReservarRoute() {
  const session = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Pre-selecting a slot via ?slot=… (NextClass deep-link).
  const preSelectedSlotId = params.get('slot');
  // Edit-bike mode: ?edit=<reservationId>. When set, the flow skips intro
  // + day picker, lands on the bike step, and `confirm` calls PATCH /bike
  // instead of POST /reservations.
  const editReservationId = params.get('edit');

  // Edit mode (?edit=…) used to skip straight to step 1 (bike picker) which
  // is the only safe shape for bike-swap: the original class must not remain
  // selected in the day picker, otherwise it looks like a normal booking and
  // can fall into the reschedule branch.
  const [step, setStep] = useState<Step>(
    preSelectedSlotId ? 1 : editReservationId ? 1 : -1,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    preSelectedSlotId,
  );
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [hoveredBikeId, setHoveredBikeId] = useState<string | null>(null);
  const [waitlistTarget, setWaitlistTarget] =
    useState<PublicClassSlot | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(
    null,
  );
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // Target slot for the remarcar confirmation (edit mode + clicked another
  // slot). Holding the slot pretty-prints the modal copy with the title +
  // hour. Null = closed.
  const [remarcarTarget, setRemarcarTarget] =
    useState<PublicClassSlot | null>(null);
  const [leaveWaitlistTarget, setLeaveWaitlistTarget] = useState<string | null>(
    null,
  );
  const [cancelReservationTarget, setCancelReservationTarget] = useState<
    string | null
  >(null);

  // --- Bike hold (temporary exclusive seat claim) ---
  // `holdExpiresAt` drives the step-3 countdown. `heldSlotRef` tracks the
  // slot we currently hold a seat on so unmount/navigation cleanup can
  // release it even when state has already changed. `heldBikeId` is the
  // bike the server currently holds for us — kept separate from
  // `selectedBikeId` because, after backing from confirm to picker, the
  // user can change selection without immediately moving the hold.
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdMsg, setHoldMsg] = useState<string | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);
  const [heldBikeId, setHeldBikeId] = useState<string | null>(null);
  const heldSlotRef = useRef<string | null>(null);
  // Tracks the last slotId we ran the rehydrate fetch for, so the effect
  // doesn't re-fire on every seat-map refetch (every 30s via polling).
  // Reset implicitly when the user picks a different slot.
  const rehydratedForSlotRef = useRef<string | null>(null);
  const qc = useQueryClient();

  const doReleaseHold = useCallback(() => {
    const s = heldSlotRef.current;
    if (!s) return;
    heldSlotRef.current = null;
    setHoldExpiresAt(null);
    setHoldSecondsLeft(null);
    setHeldBikeId(null);
    void releaseBikeHold(s);
  }, []);

  // Day picker state — anchored to today.
  const days = useMemo(() => buildWeekDays(), []);
  const [selectedDay, setSelectedDay] = useState<string>(days[0]!.iso);

  // Data
  const meQ = useMe();
  const packsQ = useMyCreditPacks();
  const reservationsQ = useMyReservations();
  const myWaitlistsQ = useMyWaitlists();
  const healthQ = useHealthGateStatus();
  const arena = useArenaStore((s) => s.selectedArenaId);

  // PAR-Q "estou ciente" gate: when the user flagged an active health concern
  // (any SIM), they must acknowledge before a NEW reservation goes through.
  // Purely front-side (the backend doesn't block on flags) and per-action.
  const parqFlagged = healthQ.data?.parq.flagged ?? false;
  const [parqAckOpen, setParqAckOpen] = useState(false);

  const dayStart = `${selectedDay}T00:00:00`;
  const dayEnd = `${selectedDay}T23:59:59.999`;
  const slotsQ = useClassSlotsRange(arena, dayStart, dayEnd);

  // G1 — overlay friend bubbles on the day's slots. Always include the
  // currently-selected slotId too, so edit-mode lands (which can pre-load
  // a slot from a different day) also get bubbles in the bike picker.
  const friendOverlaySlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of slotsQ.data ?? []) ids.add(s.id);
    if (selectedSlotId) ids.add(selectedSlotId);
    return Array.from(ids);
  }, [slotsQ.data, selectedSlotId]);
  const friendsAttendingQ = useFriendsAttendingBatch(friendOverlaySlotIds);

  // Mutations
  const createMutation = useCreateReservation();
  const changeBikeMutation = useChangeBike();
  const waitlistMutation = useJoinWaitlist();
  const leaveWaitlistMutation = useLeaveWaitlist();
  const cancelReservationMutation = useCancelReservation();

  // Track which slots the user already has reservations for. We expose both
  // the reservationId and a `canEditBike` flag derived from the 8h window so
  // StepAula can show the "trocar bike →" affordance only when valid.
  const myReservations = reservationsQ.data ?? [];
  const myActiveBySlot = useMemo(() => {
    const map = new Map<
      string,
      { reservationId: string; bikeId: string; canEditBike: boolean }
    >();
    const now = Date.now();
    for (const r of myReservations) {
      if (r.status !== 'ACTIVE' && r.status !== 'CHECKED_IN') continue;
      const startMs = new Date(r.classSlot.startsAt).getTime();
      const hoursToClass = (startMs - now) / 3_600_000;
      map.set(r.classSlotId, {
        reservationId: r.id,
        bikeId: r.bikeId,
        canEditBike: hoursToClass >= EDIT_BIKE_WINDOW_HOURS,
      });
    }
    return map;
  }, [myReservations]);

  // Pending waitlist entries by slotId — drives the "você está na fila"
  // state on each card in step-aula.
  const myWaitlistBySlot = useMemo(() => {
    const map = new Map<string, { entryId: string; position: number }>();
    for (const w of myWaitlistsQ.data ?? []) {
      map.set(w.classSlotId, { entryId: w.id, position: w.position });
    }
    return map;
  }, [myWaitlistsQ.data]);

  // Resolve edit-mode metadata from the reservation list. When ?edit=<id>
  // is present we look up the reservation, derive the slotId, and seed
  // `selectedBikeId` with the existing bike so the user can see what
  // they're replacing.
  const editingReservation = useMemo(() => {
    if (!editReservationId) return null;
    return (
      myReservations.find((r) => r.id === editReservationId) ?? null
    );
  }, [editReservationId, myReservations]);

  useEffect(() => {
    if (!editingReservation) return;
    if (step === 0) return;
    if (selectedSlotId !== editingReservation.classSlotId) {
      setSelectedSlotId(editingReservation.classSlotId);
    }
  }, [editingReservation, selectedSlotId, step]);

  const seatMapQ = useSeatMap(selectedSlotId ?? undefined);

  // User's "usual" bike — most-frequent past bike at the same unit.
  const usualBikeId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of myReservations) {
      if (r.status === 'CHECKED_IN' || r.status === 'COMPLETED') {
        counts.set(r.bikeId, (counts.get(r.bikeId) ?? 0) + 1);
      }
    }
    let bestId: string | null = null;
    let bestCount = 0;
    for (const [id, c] of counts) {
      if (c > bestCount) {
        bestId = id;
        bestCount = c;
      }
    }
    return bestId;
  }, [myReservations]);

  // --- derived ---
  const selectedBike: PublicBike | null = useMemo(() => {
    if (!selectedBikeId || !seatMapQ.data) return null;
    return seatMapQ.data.bikes.find((b) => b.id === selectedBikeId) ?? null;
  }, [selectedBikeId, seatMapQ.data]);

  // Auto-redirect after success ceremony.
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 2400);
    return () => clearTimeout(t);
  }, [step, navigate]);

  // Step-3 (confirmation) countdown. The hold's `expiresAt` is the source
  // of truth — when it passes, release the hold and bounce to /dashboard
  // so a parked confirmation screen can't sit on a seat forever. Only
  // armed while actually on the confirm step.
  useEffect(() => {
    if (step !== 2 || !holdExpiresAt) {
      setHoldSecondsLeft(null);
      return;
    }
    const target = new Date(holdExpiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setHoldSecondsLeft(left);
      if (left <= 0) {
        doReleaseHold();
        navigate('/dashboard', { replace: true });
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [step, holdExpiresAt, doReleaseHold, navigate]);

  // Reservation confirmed (step 3): the backend already consumed the hold
  // on create; for the edit/remarcar paths it didn't, so release to be
  // safe. Idempotent either way.
  useEffect(() => {
    if (step === 3) doReleaseHold();
  }, [step, doReleaseHold]);

  // Reset the rehydrate tracker when the slot changes so re-entry on the
  // same slot (e.g. user backed to step 0 and re-picked the same slot)
  // runs the hold check again instead of being skipped as "already done".
  useEffect(() => {
    rehydratedForSlotRef.current = null;
  }, [selectedSlotId]);

  // Rehydrate the user's existing hold when they (re)enter the bike step.
  // Holds intentionally survive accidental exits (tab close, refresh,
  // phone lock, app switch) until the explicit "voltar" or the 5-min TTL.
  // If a hold exists, jump straight to the confirmation step — the user
  // already committed to a bike for this slot, no need to make them
  // re-pick it. If they want to change, "voltar" on the confirm step
  // brings them back to the picker with the seat still held.
  useEffect(() => {
    if (step !== 1) return;
    if (!selectedSlotId) return;
    if (!seatMapQ.data) return;
    if (selectedBikeId) return;
    if (rehydratedForSlotRef.current === selectedSlotId) return;
    rehydratedForSlotRef.current = selectedSlotId;
    let cancelled = false;
    void getMyBikeHold(selectedSlotId).then((hold) => {
      if (cancelled || !hold) return;
      heldSlotRef.current = selectedSlotId;
      setSelectedBikeId(hold.bikeId);
      setHeldBikeId(hold.bikeId);
      setHoldExpiresAt(hold.expiresAt);
      setHoldMsg(null);
      setStep(2);
    });
    return () => {
      cancelled = true;
    };
  }, [step, selectedSlotId, seatMapQ.data, selectedBikeId]);

  // Hooks above this gate — keep call order stable.
  if (!session) return <Navigate to="/login" replace />;

  const isEditMode = !!editingReservation;
  const goToCleanSlotPicker = () => {
    doReleaseHold();
    setSelectedSlotId(null);
    setSelectedBikeId(null);
    setConfirmError(null);
    if (isEditMode) navigate('/reservar', { replace: true });
    setStep(0);
  };

  // Pick a bike → purely local selection. The server-side hold is only
  // acquired on advance to the confirmation step, so clicking around the
  // arena doesn't block other users. The "you got beaten to it" 409
  // surfaces on advance (see `onAdvance`).
  const onSelectBike = (bid: string) => {
    setSelectedBikeId(bid);
    setHoldMsg(null);
  };

  const onSelectSlot = (s: PublicClassSlot) => {
    // Edit mode + same slot = the user wants to swap bike on the original
    // reservation. Edit mode + DIFFERENT slot = the user wants to remarcar
    // (cancel the original + book the new one). Without edit mode the rest
    // of the function handles "no reservation yet" + waitlist flows.
    if (isEditMode && editingReservation) {
      if (s.id === editingReservation.classSlotId) {
        // Same slot — proceed to bike picker (the canonical edit-bike flow).
        setStep(1);
        return;
      }
      if (s.freeSpots === 0) {
        // Can't remarcar to a full slot.
        return;
      }
      // Open the in-app confirm modal instead of a native browser alert.
      setRemarcarTarget(s);
      return;
    }

    // Default flow — no edit mode.
    const mine = myActiveBySlot.get(s.id);
    if (mine) {
      if (mine.canEditBike) {
        setSelectedSlotId(s.id);
        setSelectedBikeId(null);
        setStep(1);
        navigate(`/reservar?edit=${mine.reservationId}`);
      }
      // Outside the 8h window: do nothing (the row's copy already
      // explains why the button doesn't move forward).
      return;
    }
    if (s.freeSpots === 0) {
      setWaitlistTarget(s);
      setWaitlistPosition(null);
      setWaitlistError(null);
      return;
    }
    setSelectedSlotId(s.id);
    setSelectedBikeId(null);
  };

  const onAdvance = async () => {
    if (step === 0 && selectedSlotId) {
      setStep(1);
      return;
    }
    if (step === 1 && selectedBikeId && selectedSlotId) {
      // Advancing to the confirmation step is the moment we acquire the
      // server-side hold. The backend's `acquire` is idempotent for the
      // same (slot, bike) and swaps the held bike if the user changed
      // their mind after backing from confirm — either case lands here.
      // 409 = someone got the bike before us: clear, surface a message,
      // refetch the seat-map, and keep them on the picker.
      try {
        const hold = await acquireBikeHold(selectedSlotId, selectedBikeId);
        heldSlotRef.current = selectedSlotId;
        setHeldBikeId(hold.bikeId);
        setHoldExpiresAt(hold.expiresAt);
        setHoldMsg(null);
        setStep(2);
      } catch {
        setSelectedBikeId(null);
        setHeldBikeId(null);
        setHoldExpiresAt(null);
        heldSlotRef.current = null;
        setHoldMsg(
          'Essa bike acabou de ser pega por outra pessoa. Escolha outra.',
        );
        void qc.invalidateQueries({
          queryKey: ['seat-map', selectedSlotId],
        });
      }
    }
  };

  const onBack = () => {
    if (step === 0) {
      // In edit mode the intro doesn't apply — go straight back to the
      // dashboard. Otherwise show the standard intro screen.
      if (isEditMode) navigate('/dashboard');
      else setStep(-1);
    } else if (step === 1) {
      doReleaseHold();
      setSelectedBikeId(null);
      if (isEditMode) {
        // Bike-swap should never leave the original class selected in the
        // day picker. Back exits edit mode and returns to a clean picker.
        goToCleanSlotPicker();
        return;
      }
      setStep(0);
    } else if (step === 2) {
      // Stepping back to the picker keeps the hold alive (still choosing).
      setStep(1);
    }
  };

  const onConfirm = async () => {
    if (!selectedSlotId || !selectedBikeId) return;
    // A bike-swap on the same reservation isn't a new attendance, so it
    // doesn't need the health acknowledgment. Every other path books/attends
    // a class → gate it when the user's PAR-Q is flagged.
    const isBikeSwap =
      isEditMode &&
      !!editingReservation &&
      selectedSlotId === editingReservation.classSlotId;
    if (parqFlagged && !isBikeSwap) {
      setParqAckOpen(true);
      return;
    }
    await doConfirm();
  };

  const doConfirm = async () => {
    if (!selectedSlotId || !selectedBikeId) return;
    setConfirmError(null);

    if (isEditMode && editingReservation) {
      if (selectedSlotId === editingReservation.classSlotId) {
        changeBikeMutation.mutate(
          {
            reservationId: editingReservation.id,
            bikeId: selectedBikeId,
          },
          {
            onSuccess: () => {
              setStep(3);
            },
            onError: (err) => {
              setConfirmError(extractApiMessage(err));
            },
          },
        );
        return;
      }

      try {
        await cancelReservationMutation.mutateAsync(editingReservation.id);
        await createMutation.mutateAsync({
          classSlotId: selectedSlotId,
          bikeId: selectedBikeId,
        });
        setStep(3);
      } catch (err) {
        setConfirmError(extractApiMessage(err));
      }
      return;
    }

    createMutation.mutate(
      { classSlotId: selectedSlotId, bikeId: selectedBikeId },
      {
        onSuccess: () => {
          setStep(3);
        },
        onError: (err) => {
          // Health-gate 403 → bounce to /saude with `next` set so we land
          // back on the right slot when the user finishes accepting.
          if (err instanceof AxiosError) {
            const data = err.response?.data as
              | { code?: string }
              | undefined;
            if (data?.code === 'HEALTH_GATE_BLOCK') {
              const back = `/reservar?slot=${selectedSlotId}`;
              navigate(`/saude?next=${encodeURIComponent(back)}`);
              return;
            }
          }
          setConfirmError(extractApiMessage(err));
        },
      },
    );
  };

  const onJoinWaitlist = () => {
    if (!waitlistTarget) return;
    setWaitlistError(null);
    waitlistMutation.mutate(waitlistTarget.id, {
      onSuccess: (data) => {
        setWaitlistPosition(data.position);
      },
      onError: (err) => {
        setWaitlistError(extractApiMessage(err));
      },
    });
  };

  const podeAvancar =
    (step === 0 && !!selectedSlotId) || (step === 1 && !!selectedBikeId);

  const isSubmitting =
    createMutation.isPending ||
    changeBikeMutation.isPending ||
    cancelReservationMutation.isPending;

  const myExistingBikeIdOnSelected = selectedSlotId
    ? (myActiveBySlot.get(selectedSlotId)?.bikeId ?? null)
    : null;
  const isBikeSwapMode =
    !!editingReservation && selectedSlotId === editingReservation.classSlotId;

  const myReservedSlotsForList = useMemo(() => {
    const m = new Map<
      string,
      { reservationId: string; canEditBike: boolean }
    >();
    for (const [slotId, info] of myActiveBySlot) {
      m.set(slotId, {
        reservationId: info.reservationId,
        canEditBike: info.canEditBike,
      });
    }
    return m;
  }, [myActiveBySlot]);

  return (
    <div className="min-h-svh bg-cream">
      <ReservarTopBar
        step={Math.max(0, step)}
        showStep={step >= 0 && step < 3}
      />

      <main className="mx-auto max-w-[1280px] px-6 pb-20">
        {step === -1 && (
          <Intro
            userName={meQ.data?.name}
            packs={packsQ.data}
            onStart={() => setStep(0)}
          />
        )}

        {step >= 0 && step < 3 && (
          <>
            <StepsBreadcrumb
              step={step}
              hasAula={!!selectedSlotId}
              hasBike={!!selectedBikeId}
              onJump={(target) => {
                if (isEditMode && target === 0) {
                  goToCleanSlotPicker();
                  return;
                }
                setStep(target as Step);
              }}
            />

            {isEditMode && (
              <div className="mt-4 rounded-2xl border-[1.5px] border-clay/40 bg-cream-2 px-5 py-4 text-[13px] leading-snug text-ink">
                <b className="text-clay-d">editar reserva</b> · clique no
                horário atual pra trocar a bike, ou em outro pra remarcar
                (sua reserva atual será cancelada e o crédito devolvido).
              </div>
            )}

            {!isEditMode && (
              <HealthGateBanner
                className="mt-4"
                next={
                  selectedSlotId
                    ? `/reservar?slot=${selectedSlotId}`
                    : '/reservar'
                }
              />
            )}

            <div className="pt-5">
              {step === 0 && (
                <StepAula
                  days={days}
                  selectedDay={selectedDay}
                  onSelectDay={(iso) => {
                    setSelectedDay(iso);
                    setSelectedSlotId(null);
                    setSelectedBikeId(null);
                  }}
                  slots={slotsQ.data}
                  isLoading={slotsQ.isLoading}
                  selectedSlotId={selectedSlotId ?? undefined}
                  onSelectSlot={onSelectSlot}
                  myReservedSlots={myReservedSlotsForList}
                  myWaitlistBySlot={myWaitlistBySlot}
                  onLeaveWaitlist={(slotId) => {
                    setLeaveWaitlistTarget(slotId);
                  }}
                  onCancelReservation={(reservationId) => {
                    setCancelReservationTarget(reservationId);
                  }}
                  isLeavingWaitlist={leaveWaitlistMutation.isPending}
                  isCancellingReservation={
                    cancelReservationMutation.isPending
                  }
                  friendsBySlot={friendsAttendingQ.data}
                />
              )}

              {step === 1 &&
                (isEditMode && !selectedSlotId ? (
                  <div className="rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
                    carregando sua reserva...
                  </div>
                ) : seatMapQ.data ? (
                  <>
                    {holdMsg && (
                      <div className="mb-4 rounded-2xl border-[1.5px] border-clay/40 bg-clay/10 px-5 py-3.5 text-[13px] font-semibold text-clay-d">
                        {holdMsg}
                      </div>
                    )}
                    <StepBike
                      seatMap={seatMapQ.data}
                      bikeId={selectedBikeId}
                      hoveredBikeId={hoveredBikeId}
                      onSelectBike={onSelectBike}
                      onHoverBike={setHoveredBikeId}
                      usualBikeId={usualBikeId}
                      myExistingBikeId={myExistingBikeIdOnSelected}
                      myHeldBikeId={heldBikeId}
                      editMode={isBikeSwapMode}
                      friendsOnSlot={
                        selectedSlotId
                          ? friendsAttendingQ.data?.[selectedSlotId]
                          : undefined
                      }
                    />
                  </>
                ) : (
                  <div className="rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
                    {seatMapQ.isLoading
                      ? 'carregando arena…'
                      : 'erro ao carregar a arena. tenta voltar e escolher de novo.'}
                  </div>
                ))}

              {step === 2 && seatMapQ.data && selectedBike && (
                <>
                  {holdSecondsLeft != null && (
                    <div
                      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] px-5 py-3.5 text-[13px]"
                      style={{
                        borderColor:
                          holdSecondsLeft <= 60
                            ? 'var(--color-clay)'
                            : 'var(--color-sand)',
                        background:
                          holdSecondsLeft <= 60
                            ? 'rgba(216,93,52,.10)'
                            : 'var(--color-cream-2)',
                      }}
                    >
                      <span className="text-ink-2">
                        sua bike está <b className="text-ink">reservada pra você</b> —
                        confirme antes do tempo acabar ou ela é liberada.
                      </span>
                      <span
                        className="display-tight mono shrink-0 tabular-nums"
                        style={{
                          fontSize: 22,
                          color:
                            holdSecondsLeft <= 60
                              ? 'var(--color-clay-d)'
                              : 'var(--color-ink)',
                        }}
                      >
                        {Math.floor(holdSecondsLeft / 60)}:
                        {String(holdSecondsLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  <StepConfirm
                    seatMap={seatMapQ.data}
                    bike={selectedBike}
                    packs={packsQ.data}
                    isSubmitting={isSubmitting}
                    errorMessage={confirmError}
                    onConfirm={onConfirm}
                    editMode={isBikeSwapMode}
                  />
                </>
              )}
            </div>

            {step < 2 && (
              <div className="mt-10 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full border-[1.5px] border-ink px-6 py-4 text-sm font-semibold"
                >
                  ← voltar
                </button>
                <button
                  type="button"
                  onClick={() => void onAdvance()}
                  disabled={!podeAvancar}
                  className="inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-[15px] font-semibold transition-all disabled:cursor-not-allowed"
                  style={{
                    background: podeAvancar
                      ? 'var(--color-clay)'
                      : 'var(--color-sand)',
                    color: podeAvancar
                      ? 'var(--color-cream)'
                      : 'var(--color-ink-2)',
                    boxShadow: podeAvancar
                      ? '0 18px 40px -16px rgba(216,93,52,.55)'
                      : 'none',
                  }}
                >
                  {step === 0
                    ? 'escolher bike'
                    : isBikeSwapMode
                      ? 'ir pra confirmação da troca'
                      : 'ir pra confirmação'}{' '}
                  →
                </button>
              </div>
            )}
          </>
        )}

        {step === 3 && seatMapQ.data && selectedBike && (
          <ReservationSuccess
            seatMap={seatMapQ.data}
            bike={selectedBike}
            editMode={isBikeSwapMode}
          />
        )}
      </main>

      <WaitlistModal
        slot={waitlistTarget}
        isJoining={waitlistMutation.isPending}
        position={waitlistPosition}
        errorMessage={waitlistError}
        onClose={() => {
          setWaitlistTarget(null);
          setWaitlistPosition(null);
          setWaitlistError(null);
        }}
        onConfirm={onJoinWaitlist}
      />

      <ConfirmModal
        open={!!remarcarTarget}
        onClose={() => !isSubmitting && setRemarcarTarget(null)}
        onConfirm={() => {
          if (!remarcarTarget) return;
          setSelectedSlotId(remarcarTarget.id);
          setSelectedBikeId(null);
          setConfirmError(null);
          setStep(1);
          setRemarcarTarget(null);
        }}
        title="remarcar pra essa aula?"
        description={
          remarcarTarget ? (
            <>
              Você vai escolher uma bike para{' '}
              <b className="text-ink">
                {remarcarTarget.title ??
                  remarcarTarget.classKind?.name ??
                  'essa aula'}{' '}
                às {formatHourMinute(remarcarTarget.startsAt)}
              </b>
              . Na confirmação final, a reserva atual será cancelada e o
              crédito será usado na nova aula.
            </>
          ) : undefined
        }
        confirmLabel="remarcar"
        cancelLabel="voltar"
        confirmTone="sea"
        loading={isSubmitting}
      />

      <ConfirmModal
        open={!!leaveWaitlistTarget}
        onClose={() =>
          !leaveWaitlistMutation.isPending && setLeaveWaitlistTarget(null)
        }
        onConfirm={() => {
          if (!leaveWaitlistTarget) return;
          leaveWaitlistMutation.mutate(leaveWaitlistTarget, {
            onSettled: () => setLeaveWaitlistTarget(null),
          });
        }}
        title="sair da fila?"
        description="Seu crédito volta automaticamente pra carteira."
        confirmLabel="sair da fila"
        cancelLabel="ficar"
        confirmTone="clay"
        loading={leaveWaitlistMutation.isPending}
      />

      <DoubleConsentModal
        open={parqAckOpen}
        onClose={() => !isSubmitting && setParqAckOpen(false)}
        onConfirm={() => {
          setParqAckOpen(false);
          void doConfirm();
        }}
        title="atenção à sua saúde"
        description={
          <>
            No seu PAR-Q você marcou <b>pontos de atenção</b>. A gente
            recomenda uma <b>avaliação médica</b> antes de pedalar e que você
            avise a equipe na recepção — a gente cuida de você durante a aula.
          </>
        }
        consentLabel="Estou ciente e assumo a responsabilidade de pedalar hoje."
        confirmLabel="entendi, reservar"
        loading={isSubmitting}
      />

      <ConfirmModal
        open={!!cancelReservationTarget}
        onClose={() =>
          !cancelReservationMutation.isPending &&
          setCancelReservationTarget(null)
        }
        onConfirm={() => {
          if (!cancelReservationTarget) return;
          cancelReservationMutation.mutate(cancelReservationTarget, {
            onSettled: () => setCancelReservationTarget(null),
          });
        }}
        title="cancelar dentro da janela?"
        description="Está dentro da janela de 8h, então o crédito não volta e será consumido."
        confirmLabel="cancelar e perder crédito"
        cancelLabel="manter"
        confirmTone="clay"
        loading={cancelReservationMutation.isPending}
      />
    </div>
  );
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string | string[]; code?: string }
      | undefined;
    if (data?.code === 'CPF_REQUIRED') {
      return 'Você precisa cadastrar seu CPF antes de reservar.';
    }
    if (Array.isArray(data?.message)) return data!.message!.join(' · ');
    if (typeof data?.message === 'string') return data!.message!;
  }
  return 'Algo deu errado. Tenta de novo em alguns segundos.';
}
