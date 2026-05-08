import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AxiosError } from 'axios';
import { useFriendsAttendingBatch } from '@/api/friends';
import {
  useChangeBike,
  useCreateReservation,
  useJoinWaitlist,
  useMe,
  useMyCreditPacks,
  useMyReservations,
} from '@/api/me';
import {
  useClassSlotsRange,
  useDefaultUnit,
  useSeatMap,
  type PublicBike,
  type PublicClassSlot,
} from '@/api/public';
import { HealthGateBanner } from '@/components/common';
import { Intro } from '@/components/reservar/intro';
import { StepAula, buildWeekDays } from '@/components/reservar/step-aula';
import { StepBike } from '@/components/reservar/step-bike';
import { StepConfirm } from '@/components/reservar/step-confirm';
import { StepsBreadcrumb } from '@/components/reservar/steps-breadcrumb';
import { ReservationSuccess } from '@/components/reservar/success';
import { ReservarTopBar } from '@/components/reservar/top-bar';
import { WaitlistModal } from '@/components/reservar/waitlist-modal';
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

  const [step, setStep] = useState<Step>(
    preSelectedSlotId || editReservationId ? 1 : -1,
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

  // Day picker state — anchored to today.
  const days = useMemo(() => buildWeekDays(), []);
  const [selectedDay, setSelectedDay] = useState<string>(days[0]!.iso);

  // Data
  const meQ = useMe();
  const packsQ = useMyCreditPacks();
  const reservationsQ = useMyReservations();
  const { unit } = useDefaultUnit();

  const dayStart = `${selectedDay}T00:00:00.000Z`;
  const dayEnd = `${selectedDay}T23:59:59.999Z`;
  const slotsQ = useClassSlotsRange(unit?.id, dayStart, dayEnd);

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
    if (selectedSlotId !== editingReservation.classSlotId) {
      setSelectedSlotId(editingReservation.classSlotId);
    }
  }, [editingReservation, selectedSlotId]);

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

  // Hooks above this gate — keep call order stable.
  if (!session) return <Navigate to="/login" replace />;

  const isEditMode = !!editingReservation;

  const onSelectSlot = (s: PublicClassSlot) => {
    // If the user already has a reservation on this slot, route them
    // through the edit-bike flow instead of starting a new one (which
    // the backend would reject as a double-booking).
    const mine = myActiveBySlot.get(s.id);
    if (mine) {
      if (mine.canEditBike) {
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

  const onAdvance = () => {
    if (step === 0 && selectedSlotId) setStep(1);
    else if (step === 1 && selectedBikeId) setStep(2);
  };

  const onBack = () => {
    if (step === 0) setStep(-1);
    else if (step === 1) {
      if (isEditMode) {
        navigate('/dashboard');
        return;
      }
      setSelectedBikeId(null);
      setStep(0);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const onConfirm = () => {
    if (!selectedSlotId || !selectedBikeId) return;
    setConfirmError(null);

    if (isEditMode && editingReservation) {
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
    createMutation.isPending || changeBikeMutation.isPending;

  const myExistingBikeIdOnSelected = selectedSlotId
    ? (myActiveBySlot.get(selectedSlotId)?.bikeId ?? null)
    : null;

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
              onJump={(target) => setStep(target as Step)}
            />

            {isEditMode && (
              <div className="mt-4 rounded-2xl border-[1.5px] border-clay/40 bg-cream-2 px-5 py-4 text-[13px] leading-snug text-ink">
                <b className="text-clay-d">trocar bike</b> · sua reserva fica,
                só a bike muda. crédito não é cobrado de novo.
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
                  friendsBySlot={friendsAttendingQ.data}
                />
              )}

              {step === 1 &&
                (seatMapQ.data ? (
                  <StepBike
                    seatMap={seatMapQ.data}
                    bikeId={selectedBikeId}
                    hoveredBikeId={hoveredBikeId}
                    onSelectBike={(id) => setSelectedBikeId(id)}
                    onHoverBike={setHoveredBikeId}
                    usualBikeId={usualBikeId}
                    myExistingBikeId={myExistingBikeIdOnSelected}
                    editMode={isEditMode}
                    friendsOnSlot={
                      selectedSlotId
                        ? friendsAttendingQ.data?.[selectedSlotId]
                        : undefined
                    }
                  />
                ) : (
                  <div className="rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
                    {seatMapQ.isLoading
                      ? 'carregando arena…'
                      : 'erro ao carregar a arena. tenta voltar e escolher de novo.'}
                  </div>
                ))}

              {step === 2 && seatMapQ.data && selectedBike && (
                <StepConfirm
                  seatMap={seatMapQ.data}
                  bike={selectedBike}
                  packs={packsQ.data}
                  isSubmitting={isSubmitting}
                  errorMessage={confirmError}
                  onConfirm={onConfirm}
                  editMode={isEditMode}
                />
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
                  onClick={onAdvance}
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
                    : isEditMode
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
            editMode={isEditMode}
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
