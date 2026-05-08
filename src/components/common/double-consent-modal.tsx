import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DoubleConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  /// Body of step 1 — describes the action being taken.
  description: ReactNode;
  /// The consent line on step 2. Shown next to the checkbox; the user must
  /// tick it to enable the final confirm button. Phrase it as the *cost* of
  /// the action ("Confirmo que essa reserva já passou do prazo de 8h e vai
  /// consumir uma aula do meu pacote").
  consentLabel: string;
  /// Defaults to "confirmar e consumir crédito".
  confirmLabel?: string;
  /// Defaults to "voltar".
  cancelLabel?: string;
  /// While true, disables both buttons and shows loading label.
  loading?: boolean;
}

/// Two-step modal for actions that **consume a credit / are irreversible**.
/// Step 1 explains the action; step 2 surfaces the cost as an explicit
/// checkbox the user must tick before the confirm button enables.
///
/// Use cases:
/// - cancelar reserva dentro do prazo de 8h (consome aula do pacote)
/// - marcar ausência manual (NO_SHOW)
/// - excluir tipo de aula em cascata (cancela aulas existentes)
export function DoubleConsentModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  consentLabel,
  confirmLabel = 'confirmar e consumir crédito',
  cancelLabel = 'voltar',
  loading = false,
}: DoubleConsentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAgreed(false);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-6 py-10 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dc-modal-title"
    >
      <div
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-3xl bg-cream shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-sand bg-cream-2 px-7 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-clay">
            confirmação · {step}/2
          </span>
          <div className="flex gap-1.5">
            <span
              className={`h-1 w-8 rounded-full transition-colors ${
                step >= 1 ? 'bg-clay' : 'bg-sand'
              }`}
            />
            <span
              className={`h-1 w-8 rounded-full transition-colors ${
                step >= 2 ? 'bg-clay' : 'bg-sand'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-7 pb-6 pt-6">
          <div
            id="dc-modal-title"
            className="display-tight text-[28px] leading-tight text-ink"
          >
            {title}
          </div>

          {step === 1 && (
            <div className="text-[14px] leading-relaxed text-ink-2">
              {description}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="rounded-2xl border-2 border-clay bg-clay/5 px-4 py-3.5 text-[13px] leading-relaxed text-ink">
                <span className="font-bold text-clay">atenção: </span>
                {consentLabel}
              </div>
              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-cream-2 px-4 py-3 transition-colors hover:bg-sand/40">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-clay"
                />
                <span className="text-[13px] font-semibold leading-snug text-ink">
                  Entendi e quero seguir mesmo assim.
                </span>
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-7 py-4">
          {step === 1 && (
            <>
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
                onClick={() => setStep(2)}
                disabled={loading}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-ink-2 disabled:opacity-60"
              >
                continuar →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="rounded-full border-[1.5px] border-ink px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60"
              >
                ← voltar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!agreed || loading}
                className="rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay-d disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'processando...' : confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
