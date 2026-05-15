import { useState } from 'react';
import { useFinalizeClassSlot } from '@/api/professor';
import type { AdminClassSlot } from '@/api/admin';
import { ConfirmModal } from '@/components/common/confirm-modal';

interface Props {
  slot: AdminClassSlot;
  /// Parent owns the LiveCancelModal (it needs the full AdminClassSlot).
  onEmergencyCancel: () => void;
  /// Fired after a successful finalize so the route can toast + redirect.
  onFinalized: () => void;
}

/// Fixed bottom action bar for the AO VIVO screen. Two actions:
///   - cancelar emergência → defers to the parent's LiveCancelModal
///   - finalizar aula      → ConfirmModal (CLAUDE.md: never window.confirm)
///                            then `useFinalizeClassSlot`
/// Sits above the iOS gesture bar via `safe-area-inset-bottom`. When the
/// slot is no longer SCHEDULED (already cancelled or completed) the bar
/// collapses to a status note — there's nothing left to act on.
export function LiveActionBar({ slot, onEmergencyCancel, onFinalized }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const finalize = useFinalizeClassSlot();

  const closed = slot.status !== 'SCHEDULED';
  const closedLabel =
    slot.status === 'COMPLETED'
      ? 'aula finalizada'
      : slot.status === 'CANCELLED_DURING'
        ? 'aula cancelada durante'
        : slot.status === 'CANCELLED_BEFORE'
          ? 'aula cancelada'
          : 'aula encerrada';

  const handleFinalize = () => {
    finalize.mutate(slot.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        onFinalized();
      },
    });
  };

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-cream/95 backdrop-blur-md"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-5 py-3 sm:px-7 lg:px-8">
          {closed ? (
            <div className="flex-1 text-center text-[13px] font-semibold uppercase tracking-wide text-ink-2">
              {closedLabel} — nada a fazer aqui
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onEmergencyCancel}
                className="flex-1 rounded-full border-[1.5px] border-clay-d px-4 py-3.5 text-[14px] font-semibold text-clay-d transition-colors hover:bg-clay-d/8 sm:flex-none sm:px-7"
              >
                cancelar emergência
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex-1 rounded-full bg-ink px-4 py-3.5 text-[14px] font-semibold text-cream transition-colors hover:bg-ink-2 sm:px-7"
              >
                finalizar aula
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !finalize.isPending && setConfirmOpen(false)}
        onConfirm={handleFinalize}
        title="finalizar a aula?"
        description={
          <>
            Quem está marcado como <b>presente</b> fica como concluído. Quem
            ficou <b>reservado sem presença</b> vira ausência e perde o
            crédito. Isso não dá pra desfazer.
          </>
        }
        confirmLabel={finalize.isPending ? 'finalizando…' : 'finalizar aula'}
        cancelLabel="voltar"
        confirmTone="ink"
        loading={finalize.isPending}
        meta={
          finalize.isError ? (
            <span className="text-clay-d">
              não rolou finalizar — tenta de novo
            </span>
          ) : undefined
        }
      />
    </>
  );
}
