import { useState } from 'react';
import { type AdminClassSlot } from '@/api/admin';
import { useMe } from '@/api/me';
import {
  ProfessorTopBar,
  type ProfessorTabId,
} from '@/components/professor/top-bar';
import { CancelModal } from '@/components/professor/cancel-modal';
import { CheckInDrawer } from '@/components/professor/check-in-drawer';
import { CreateClassModal } from '@/components/professor/create-class-modal';
import { FirstLoginModal } from '@/components/professor/first-login-modal';
import { LiveCancelModal } from '@/components/professor/live-cancel-modal';
import { Toast } from '@/components/professor/toast';
import { AgendaTab } from '@/components/professor/tabs/agenda';
import { AlunosTab } from '@/components/professor/tabs/alunos';
import { DashboardTab } from '@/components/professor/tabs/dashboard';

export function ProfessorRoute() {
  const meQ = useMe();
  const [tab, setTab] = useState<ProfessorTabId>('dashboard');
  const [cancelTarget, setCancelTarget] = useState<AdminClassSlot | null>(null);
  const [liveTarget, setLiveTarget] = useState<AdminClassSlot | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<AdminClassSlot | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (meQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-ink-2">Carregando...</p>
      </div>
    );
  }

  if (meQ.isError || !meQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-clay-d">Não conseguimos carregar sua conta.</p>
      </div>
    );
  }

  const me = meQ.data;
  if (me.role !== 'INSTRUCTOR' && me.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-ink-2">Acesso negado.</p>
      </div>
    );
  }

  const firstName = me.name.split(' ')[0] ?? 'professor';

  return (
    <div className="min-h-screen bg-cream pb-24">
      <ProfessorTopBar active={tab} onChange={setTab} me={me} />

      <main className="mx-auto max-w-[1320px] px-5 sm:px-7 lg:px-8">
        {tab === 'dashboard' && (
          <DashboardTab
            me={me}
            onChangeTab={setTab}
            onOpenCreateClass={() => setCreateOpen(true)}
            onOpenCancel={(s) => setCancelTarget(s)}
            onOpenLiveCancel={(s) => setLiveTarget(s)}
            onOpenCheckIn={(s) => setCheckInTarget(s)}
          />
        )}
        {tab === 'agenda' && (
          <AgendaTab
            me={me}
            onOpenCreateClass={() => setCreateOpen(true)}
            onOpenCancel={(s) => setCancelTarget(s)}
          />
        )}
        {tab === 'alunos' && <AlunosTab me={me} />}
      </main>

      {me.mustChangePassword && <FirstLoginModal firstName={firstName} />}

      <CreateClassModal
        open={createOpen}
        me={me}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setToast('Aula criada — apareceu na grade.')}
      />
      <CancelModal
        open={!!cancelTarget}
        slot={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={() =>
          setToast('Aula cancelada — alunos serão avisados.')
        }
      />
      <LiveCancelModal
        open={!!liveTarget}
        slot={liveTarget}
        onClose={() => setLiveTarget(null)}
        onCancelled={() => setToast('Cancelamento de emergência registrado.')}
      />
      <CheckInDrawer
        open={!!checkInTarget}
        slot={checkInTarget}
        onClose={() => setCheckInTarget(null)}
        onSubmitted={(s) => {
          const ignoredTail =
            s.ignored > 0 ? ` · ${s.ignored} bloqueada(s)` : '';
          setToast(
            `presença registrada · ${s.checkedIn} pres / ${s.noShow} aus${ignoredTail}`,
          );
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
