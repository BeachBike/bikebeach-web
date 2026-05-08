import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

/// Modal usado quando o aluno marca presença ausente DURANTE a aula. Pede
/// uma justificativa (≥ 3 chars) e deixa explícito que o crédito é perdido —
/// é a versão UX do mesmo signal que o cron emite via NO_SHOW silencioso.
export function AbsenceModal({ open, onClose, onConfirm, loading }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      return;
    }
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

  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 3 && !loading;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-6 py-10 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="absence-modal-title"
    >
      <div
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-3xl bg-cream shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-3 px-7 pb-5 pt-7">
          <div
            id="absence-modal-title"
            className="display-tight text-[28px] leading-tight text-ink"
          >
            marcar ausência
          </div>
          <div className="text-[14px] leading-relaxed text-ink-2">
            Deixe um motivo curto pra que o estúdio entenda. O crédito é
            consumido (a vaga ficou bloqueada pra outra pessoa), e a reserva
            vai pro histórico como ausência.
          </div>
          <label className="mt-1 block">
            <span className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
              motivo
            </span>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: passei mal, tive um imprevisto…"
              rows={3}
              maxLength={500}
              className="mt-2 w-full resize-y rounded-xl border-[1.5px] border-sand bg-cream-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ink"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-2">
              <span>{trimmed.length < 3 ? 'mín. 3 caracteres' : ' '}</span>
              <span>{reason.length}/500</span>
            </div>
          </label>
          <div className="rounded-xl border-2 border-clay bg-clay/5 px-4 py-3 text-[13px] leading-snug text-clay-d">
            <b>atenção:</b> ao confirmar, 1 crédito é descontado e a operação
            não pode ser desfeita.
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border-[1.5px] border-ink px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60"
          >
            voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!canConfirm}
            className="rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay-d disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'marcando…' : 'confirmar ausência'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
