import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import {
  useCancelReservation,
  useCancelSubscription,
  useMe,
  useMyCreditPacks,
  useMyPayments,
  useMyReservations,
  useMySubscriptions,
  useSelfNoShow,
  type Reservation,
} from '@/api/me';
import {
  ConfirmModal,
  DoubleConsentModal,
  HealthGateBanner,
} from '@/components/common';
import { AmigosSection } from '@/components/dashboard/amigos-section';
import { HelpFab, HelpSheet } from '@/components/onboarding/help-fab';
import { OnboardingTour } from '@/components/onboarding/tour';
import { Hello } from '@/components/dashboard/hello';
import { HistoricoSection } from '@/components/dashboard/historico-section';
import { KPIs } from '@/components/dashboard/kpis';
import { NextClass } from '@/components/dashboard/next-class';
import { PagamentosSection } from '@/components/dashboard/pagamentos-section';
import { PlanoCard } from '@/components/dashboard/plano-card';
import { MyPacksSection } from '@/components/planos/my-packs-section';
import { Recs } from '@/components/dashboard/recs';
import { ReservasList } from '@/components/dashboard/reservas-list';
import { TopBar, type DashboardTab } from '@/components/dashboard/top-bar';
import { useAuthStore } from '@/stores/auth';
import { formatFullDate, formatHourMinute } from '@/lib/format';

/// Authenticated dashboard. All data is wired to the backend — no hardcoded
/// fixtures. Auth gate is the persisted Zustand session; the real source of
/// truth is `/users/me`, which the queries below load lazily.
export function DashboardRoute() {
  const session = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<DashboardTab>('inicio');

  // Snap to top on tab switch — same UX as a real page navigation.
  // Without this the user lands midway through a long tab if the previous
  // one was scrolled.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  const meQ = useMe();
  const packsQ = useMyCreditPacks();
  const subsQ = useMySubscriptions();
  const reservationsQ = useMyReservations();
  const paymentsQ = useMyPayments();

  const cancelMutation = useCancelReservation();
  const cancelSubscriptionMutation = useCancelSubscription();
  const selfNoShowMutation = useSelfNoShow();
  const [pendingCancel, setPendingCancel] = useState<Reservation | null>(null);
  const [pendingAbsenceId, setPendingAbsenceId] = useState<string | null>(
    null,
  );

  // Onboarding tour + help UI. Tour auto-opens on first dashboard load when
  // `me.hasSeenOnboarding === false`. The HelpSheet is the bottom-sheet
  // triggered by the FAB and by the Footer "ajuda" link; "rever tour" from
  // the sheet reopens the tour without touching the backend flag.
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [autoTourTriggered, setAutoTourTriggered] = useState(false);
  useEffect(() => {
    if (
      !autoTourTriggered &&
      meQ.data &&
      meQ.data.role === 'USER' &&
      !meQ.data.hasSeenOnboarding
    ) {
      // Defer one tick so the user sees the dashboard frame land before the
      // tour overlay slides in — less jarring than appearing pre-paint.
      const t = setTimeout(() => setTourOpen(true), 350);
      setAutoTourTriggered(true);
      return () => clearTimeout(t);
    }
  }, [meQ.data, autoTourTriggered]);

  // Tick that drives time-based re-evaluation of `pickNextReservation`
  // so a class transitions "próxima → ao vivo" without a refresh. 30s
  // granularity is enough — NextClass internally ticks 1s for the
  // countdown.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!session) return <Navigate to="/login" replace />;

  const requestCancel = (reservation: Reservation) => {
    setPendingCancel(reservation);
  };

  const closeCancel = () => setPendingCancel(null);

  const confirmCancel = () => {
    if (!pendingCancel) return;
    cancelMutation.mutate(pendingCancel.id, {
      onSettled: () => setPendingCancel(null),
    });
  };

  const onMarkAbsent = (reservationId: string, reason: string) => {
    setPendingAbsenceId(reservationId);
    selfNoShowMutation.mutate(
      { reservationId, reason },
      { onSettled: () => setPendingAbsenceId(null) },
    );
  };

  const onCancelSubscription = (subscriptionId: string) => {
    cancelSubscriptionMutation.mutate(subscriptionId);
  };

  const reservations = reservationsQ.data;
  const nextReservation = useMemo(
    () => pickNextReservation(reservations, nowTick),
    [reservations, nowTick],
  );
  const userName = meQ.data?.name ?? session.email;
  const userEmail = meQ.data?.email ?? session.email;

  // Cancellation window logic — mirrors backend
  // (`STANDARD_CANCELLATION_WINDOW_HOURS` / `WAITLIST_PROTECTED…`).
  const cancelInfo = pendingCancel
    ? deriveCancelInfo(pendingCancel)
    : null;

  return (
    <div className="min-h-svh bg-cream">
      <TopBar
        tab={tab}
        onTabChange={setTab}
        user={{ name: userName, email: userEmail }}
      />

      <main className="mx-auto max-w-[1280px] px-6 pb-20">
        <HealthGateBanner next="/dashboard" className="mt-5" />
        {tab === 'inicio' && (
          <>
            <Hello name={meQ.data?.name} />
            <KPIs packs={packsQ.data} reservations={reservations} />
            <div className="mt-4 grid grid-cols-12 gap-4">
              <NextClass
                reservation={nextReservation}
                onCancel={() =>
                  nextReservation && requestCancel(nextReservation)
                }
                onMarkAbsent={onMarkAbsent}
                cancelling={
                  cancelMutation.isPending &&
                  pendingCancel?.id === nextReservation?.id
                }
                markingAbsent={
                  selfNoShowMutation.isPending &&
                  pendingAbsenceId === nextReservation?.id
                }
              />
              <PlanoCard
                packs={packsQ.data}
                subscriptions={subsQ.data}
                onCancelSubscription={onCancelSubscription}
                isCancelingSubscription={cancelSubscriptionMutation.isPending}
              />
            </div>
            <ReservasList
              reservations={reservations}
              onCancel={requestCancel}
              cancellingId={
                cancelMutation.isPending ? pendingCancel?.id ?? null : null
              }
              hideId={nextReservation?.id}
            />
            <Recs reservations={reservations} />
          </>
        )}

        {tab === 'aulas' && (
          <>
            <Hello name={meQ.data?.name} />
            <ReservasList
              reservations={reservations}
              onCancel={requestCancel}
              cancellingId={
                cancelMutation.isPending ? pendingCancel?.id ?? null : null
              }
            />
            <Recs reservations={reservations} />
          </>
        )}

        {tab === 'historico' && (
          <>
            <Hello name={meQ.data?.name} />
            <div className="mt-4">
              <HistoricoSection reservations={reservations} />
            </div>
          </>
        )}

        {tab === 'plano' && (
          <>
            <Hello name={meQ.data?.name} />
            <div className="mt-4 grid grid-cols-12 gap-4">
              <PlanoCard
                packs={packsQ.data}
                subscriptions={subsQ.data}
                onCancelSubscription={onCancelSubscription}
                isCancelingSubscription={cancelSubscriptionMutation.isPending}
              />
              <PagamentosSection payments={paymentsQ.data} />
            </div>
            {/* Wallet — every active pack, with the transfer/share CTAs
                gated by each pack's snapshotted flags. Lives in the
                "meu plano" tab so the user finds it where they manage
                credits, not buried inside /planos. */}
            {packsQ.data && packsQ.data.length > 0 && (
              <div className="mt-6">
                <MyPacksSection packs={packsQ.data} />
              </div>
            )}
          </>
        )}

        {tab === 'amigos' && (
          <>
            <Hello name={meQ.data?.name} />
            <div className="mt-4 grid grid-cols-12 gap-4">
              <AmigosSection />
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-sand px-6 py-6 text-[13px] text-ink-2">
        <span>© 2026 bikebeach · balneário camboriú</span>
        <div className="flex gap-5">
          <a href="/">home</a>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="hover:text-ink"
          >
            ajuda
          </button>
        </div>
      </footer>

      {/* Help UX — FAB always visible on mobile, sheet shared with footer.
          "rever tour" reopens the tour overlay without touching the backend
          flag (the flag stays true once the user has seen it once). */}
      <HelpFab onClick={() => setHelpOpen(true)} />
      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onReplayTour={() => {
          setHelpOpen(false);
          setTourOpen(true);
        }}
      />
      <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Cancel-reservation modals — type depends on whether the action
          will refund the credit (ConfirmModal) or burn it (DoubleConsent). */}
      {cancelInfo?.willRefund && (
        <ConfirmModal
          open={!!pendingCancel}
          onClose={closeCancel}
          onConfirm={confirmCancel}
          title="cancelar essa reserva?"
          description={
            <>
              {cancelInfo.titleLine}
              <br />
              <b className="text-ink">
                Você ainda está fora da janela{' '}
                {pendingCancel?.promotedFromWaitlist ? '(2h)' : '(8h)'} — o
                crédito volta automático pra sua carteira.
              </b>
            </>
          }
          confirmLabel="cancelar reserva"
          cancelLabel="manter"
          confirmTone="clay"
          loading={cancelMutation.isPending}
        />
      )}
      {cancelInfo && !cancelInfo.willRefund && (
        <DoubleConsentModal
          open={!!pendingCancel}
          onClose={closeCancel}
          onConfirm={confirmCancel}
          title="cancelar dentro da janela?"
          description={
            <>
              {cancelInfo.titleLine}
              <br />
              Você está dentro da janela de{' '}
              {pendingCancel?.promotedFromWaitlist ? '2h' : '8h'} — pela regra
              da casa, o crédito é consumido se cancelar agora.
            </>
          }
          consentLabel={`Confirmo que essa reserva está dentro da janela de ${pendingCancel?.promotedFromWaitlist ? '2h' : '8h'} e o crédito vai ser descontado mesmo assim.`}
          confirmLabel="cancelar e perder crédito"
          loading={cancelMutation.isPending}
        />
      )}
    </div>
  );
}

interface CancelInfo {
  willRefund: boolean;
  titleLine: string;
}

/// Picks `8h` for standard, `2h` for waitlist-promoted reservations to
/// match `STANDARD_CANCELLATION_WINDOW_HOURS` /
/// `WAITLIST_PROTECTED_CANCELLATION_WINDOW_HOURS` on the backend.
function deriveCancelInfo(r: Reservation): CancelInfo {
  const startMs = new Date(r.classSlot.startsAt).getTime();
  const hoursToClass = (startMs - Date.now()) / 3_600_000;
  const window = r.promotedFromWaitlist ? 2 : 8;
  const willRefund = hoursToClass >= window;
  const titulo =
    r.classSlot.classKind?.name?.toLowerCase() ?? r.classSlot.title ?? 'aula';
  return {
    willRefund,
    titleLine: `${titulo} · ${formatFullDate(r.classSlot.startsAt)} às ${formatHourMinute(r.classSlot.startsAt)}.`,
  };
}

/// Pick the reservation to feature in the NextClass hero card.
///
/// Includes ACTIVE / CHECKED_IN with `endsAt > now` so a class that's
/// currently LIVE (between startsAt and endsAt) keeps the card visible —
/// this is the bug from item-3 where the card would disappear the moment
/// the class started.
///
/// Cancelled-by-studio reservations are excluded: they live in histórico
/// for 24h after the original startsAt, not on the upcoming hero.
function pickNextReservation(
  reservations: Reservation[] | undefined,
  nowMs: number,
): Reservation | undefined {
  if (!reservations) return undefined;
  return reservations
    .filter((r) => {
      if (r.status !== 'ACTIVE' && r.status !== 'CHECKED_IN') return false;
      const startMs = new Date(r.classSlot.startsAt).getTime();
      const endMs = startMs + r.classSlot.durationMinutes * 60_000;
      return endMs > nowMs;
    })
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    )[0];
}
