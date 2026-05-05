import { useState } from 'react';
import { Navigate } from 'react-router';
import {
  useCancelReservation,
  useMe,
  useMyCreditPacks,
  useMyPayments,
  useMyReservations,
  type Reservation,
} from '@/api/me';
import { Hello } from '@/components/dashboard/hello';
import { HistoricoSection } from '@/components/dashboard/historico-section';
import { KPIs } from '@/components/dashboard/kpis';
import { NextClass } from '@/components/dashboard/next-class';
import { PagamentosSection } from '@/components/dashboard/pagamentos-section';
import { PlanoCard } from '@/components/dashboard/plano-card';
import { Recs } from '@/components/dashboard/recs';
import { ReservasList } from '@/components/dashboard/reservas-list';
import { TopBar, type DashboardTab } from '@/components/dashboard/top-bar';
import { useAuthStore } from '@/stores/auth';

/// Authenticated dashboard. All data is wired to the backend — no hardcoded
/// fixtures. Auth gate is the persisted Zustand session; the real source of
/// truth is `/users/me`, which the queries below load lazily.
export function DashboardRoute() {
  const session = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<DashboardTab>('inicio');

  const meQ = useMe();
  const packsQ = useMyCreditPacks();
  const reservationsQ = useMyReservations();
  const paymentsQ = useMyPayments();

  const cancelMutation = useCancelReservation();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (!session) return <Navigate to="/login" replace />;

  const onCancel = (reservationId: string) => {
    setCancellingId(reservationId);
    cancelMutation.mutate(reservationId, {
      onSettled: () => setCancellingId(null),
    });
  };

  const reservations = reservationsQ.data;
  const nextReservation = pickNextReservation(reservations);
  const userName = meQ.data?.name ?? session.email;
  const userEmail = meQ.data?.email ?? session.email;

  return (
    <div className="min-h-svh bg-cream">
      <TopBar
        tab={tab}
        onTabChange={setTab}
        user={{ name: userName, email: userEmail }}
      />

      <main className="mx-auto max-w-[1280px] px-6 pb-20">
        {tab === 'inicio' && (
          <>
            <Hello name={meQ.data?.name} />
            <KPIs packs={packsQ.data} reservations={reservations} />
            <div className="mt-4 grid grid-cols-12 gap-4">
              <NextClass
                reservation={nextReservation}
                onCancel={onCancel}
                cancelling={cancellingId === nextReservation?.id}
              />
              <PlanoCard packs={packsQ.data} />
            </div>
            <ReservasList
              reservations={reservations}
              onCancel={onCancel}
              cancellingId={cancellingId}
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
              onCancel={onCancel}
              cancellingId={cancellingId}
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
              <PlanoCard packs={packsQ.data} />
              <PagamentosSection payments={paymentsQ.data} />
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-sand px-6 py-6 text-[13px] text-ink-2">
        <span>© 2026 bikebeach · balneário camboriú</span>
        <div className="flex gap-5">
          <a href="/">home</a>
          <a href="#">ajuda</a>
        </div>
      </footer>
    </div>
  );
}

function pickNextReservation(
  reservations: Reservation[] | undefined,
): Reservation | undefined {
  if (!reservations) return undefined;
  const now = Date.now();
  return reservations
    .filter(
      (r) =>
        (r.status === 'ACTIVE' || r.status === 'CHECKED_IN') &&
        new Date(r.classSlot.startsAt).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    )[0];
}
