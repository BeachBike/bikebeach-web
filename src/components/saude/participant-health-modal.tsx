import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParticipantHealth } from '@/api/health-gate';
import { ParqAnswersView } from './parq-answers-view';

interface Props {
  slotId: string;
  student: { userId: string; name: string } | null;
  onClose: () => void;
}

/// Modal que mostra o PAR-Q completo de um participante (respostas, pontos de
/// atenção, observação e datas de aceite) pro professor da aula e pro admin.
/// Compartilhado entre o roster do professor e a lista de participantes do
/// admin. Só busca quando `student` está setado.
export function ParticipantHealthModal({ slotId, student, onClose }: Props) {
  const healthQ = useParticipantHealth(slotId, student?.userId);

  useEffect(() => {
    if (!student) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handler);
    };
  }, [student, onClose]);

  if (!student) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/55 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Saúde de ${student.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-t-[24px] bg-cream p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.4)] sm:rounded-[24px] sm:pb-6"
        style={{ animation: 'slidein 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-sand sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
              saúde do aluno · PAR-Q
            </div>
            <div className="display-tight mt-1 text-[22px] leading-none lowercase">
              {student.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream-2 text-ink-2 hover:bg-sand"
          >
            ✕
          </button>
        </div>

        {healthQ.isLoading ? (
          <div className="py-10 text-center text-sm text-ink-2">
            carregando…
          </div>
        ) : healthQ.isError ? (
          <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            Não foi possível carregar os dados de saúde.
          </div>
        ) : healthQ.data ? (
          <ParqAnswersView data={healthQ.data} />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
