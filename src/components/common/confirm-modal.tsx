import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmTone = 'clay' | 'ink' | 'sea';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  /// Defaults to "confirmar". Use a verb specific to the action ("excluir",
  /// "cancelar reserva", "desativar", etc).
  confirmLabel?: string;
  /// Defaults to "voltar".
  cancelLabel?: string;
  /// Visual emphasis of the confirm button. `clay` for destructive, `ink` for
  /// neutral, `sea` for save/positive. Default `clay`.
  confirmTone?: ConfirmTone;
  /// While true, disables the confirm button and shows a small loading label.
  loading?: boolean;
  /// Optional extra info chip above the body (e.g. badge with consequence).
  meta?: ReactNode;
}

/// One-step confirmation modal. Blocks page scroll, closes on Esc and on
/// backdrop click. Use this for any destructive action that doesn't consume
/// user credits — for credit-consuming cancels see `DoubleConsentModal`.
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'confirmar',
  cancelLabel = 'voltar',
  confirmTone = 'clay',
  loading = false,
  meta,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  const confirmCls =
    confirmTone === 'ink'
      ? 'bg-ink text-cream hover:bg-ink-2'
      : confirmTone === 'sea'
        ? 'bg-sea text-cream hover:bg-sea-d'
        : 'bg-clay text-cream hover:bg-clay-d';

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-6 py-10 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl bg-cream shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-3 px-7 pb-6 pt-7">
          {meta && <div className="-mt-1">{meta}</div>}
          <div
            id="confirm-modal-title"
            className="display-tight text-[28px] leading-tight text-ink"
          >
            {title}
          </div>
          {description && (
            <div className="text-[14px] leading-relaxed text-ink-2">
              {description}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border-[1.5px] border-ink px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmCls}`}
          >
            {loading ? 'aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
