import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AxiosError } from 'axios';
import {
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
import { useHealthGateStatus } from '@/api/health-gate';
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

export function ReservarRoute() {
  const session = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Pre-selecting a slot via ?slot=… (NextClass deep-link).
  const preSelectedSlotId = params.get('slot');

  const [step, setStep] = useState<Step>(preSelectedSlotId ? 1 : -1);
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
  const gateQ = useHealthGateStatus();
  const { unit } = useDefaultUnit();

  const dayStart = `${selectedDay}T00:00:00.000Z`;
  const dayEnd = `${selectedDay}T23:59:59.999Z`;
  const slotsQ = useClassSlotsRange(unit?.id, dayStart, dayEnd);
  const seatMapQ = useSeatMap(selectedSlotId ?? undefined);

  // Mutations
  const createMutation = useCreateReservation();
  const waitlistMutation = useJoinWaitlist();

  // Track which slots the user already has reservations for, to render the
  // "você já tem reserva" hint and pre-select the bike on the bike step.
  const myReservations = reservationsQ.data ?? [];
  const myActiveBySlot = useMemo(() => {
    const map = new Map<string, string>(); // classSlotId → bikeId
    for (const r of myReservations) {
      if (r.status === 'ACTIVE' || r.status === 'CHECKED_IN') {
        map.set(r.classSlotId, r.bikeId);
      }
    }
    return map;
  }, [myReservations]);

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

  const onSelectSlot = (s: PublicClassSlot) => {
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
      setSelectedBikeId(null);
      setStep(0);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const onConfirm = () => {
    if (!selectedSlotId || !selectedBikeId) return;
    setConfirmError(null);
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

            {gateQ.data && !gateQ.data.ok && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-clay/40 bg-clay/10 px-5 py-4">
                <div className="text-[13px] leading-snug text-ink">
                  <b className="text-clay-d">
                    falta liberar saúde antes de reservar.
                  </b>{' '}
                  {!gateQ.data.liability.valid &&
                    'termo de responsabilidade pendente. '}
                  {!gateQ.data.parq.valid && 'par-q pendente. '}
                  Leva uns 30 segundos.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const back = selectedSlotId
                      ? `/reservar?slot=${selectedSlotId}`
                      : '/reservar';
                    navigate(`/saude?next=${encodeURIComponent(back)}`);
                  }}
                  className="rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-cream"
                >
                  liberar agora →
                </button>
              </div>
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
                  myReservedSlotIds={new Set(myActiveBySlot.keys())}
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
                    myExistingBikeId={
                      selectedSlotId
                        ? (myActiveBySlot.get(selectedSlotId) ?? null)
                        : null
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
                  isSubmitting={createMutation.isPending}
                  errorMessage={confirmError}
                  onConfirm={onConfirm}
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
                  {step === 0 ? 'escolher bike' : 'ir pra confirmação'} →
                </button>
              </div>
            )}
          </>
        )}

        {step === 3 && seatMapQ.data && selectedBike && (
          <ReservationSuccess seatMap={seatMapQ.data} bike={selectedBike} />
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
