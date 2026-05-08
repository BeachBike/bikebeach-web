import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  type AdminClassSlot,
  type PersonalCancelReason,
  useCancelClassSlot,
} from '@/api/admin';

interface CancelModalProps {
  open: boolean;
  slot: AdminClassSlot | null;
  onClose: () => void;
  onCancelled?: () => void;
}

const REASONS: { k: PersonalCancelReason; l: string }[] = [
  { k: 'SAUDE', l: 'problema de saúde' },
  { k: 'PESSOAL', l: 'motivo pessoal' },
  { k: 'CLIMA', l: 'previsão de chuva' },
  { k: 'OUTRO', l: 'outro' },
];

/// Advance cancel by the instructor (PERSONAL kind). Used in the Agenda tab
/// for upcoming classes (not the live one — that uses LiveCancelModal).
export function CancelModal({
  open,
  slot,
  onClose,
  onCancelled,
}: CancelModalProps) {
  const [reason, setReason] = useState<PersonalCancelReason | ''>('');
  const [obs, setObs] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelMut = useCancelClassSlot();

  useEffect(() => {
    if (!open) return;
    setReason('');
    setObs('');
    setError(null);
    cancelMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !slot) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reason) return setError('Escolha um motivo.');
    if (reason === 'OUTRO' && !obs.trim())
      return setError('Descreva o motivo quando "outro".');
    try {
      await cancelMut.mutateAsync({
        id: slot.id,
        kind: 'PERSONAL',
        personalReason: reason,
        description: obs.trim() || undefined,
      });
      onClose();
      onCancelled?.();
    } catch (err) {
      setError(extractMessage(err) ?? 'Não conseguimos cancelar.');
    }
  };

  const dataStr = new Date(slot.startsAt).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const horaStr = new Date(slot.startsAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-ink/45 px-6 py-10 backdrop-blur-sm"
      style={{ animation: 'fadein .2s ease both' }}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-3xl bg-cream p-7 shadow-2xl"
        style={{ animation: 'slidein .3s cubic-bezier(.2,.7,.2,1) both' }}
      >
        <div className="display-tight text-[28px] leading-tight">
          cancelar essa aula?
        </div>
        <p className="mt-2 text-sm text-ink-2">
          {slot.classKind?.name ?? slot.title ?? 'aula'} ·{' '}
          <span className="capitalize">{dataStr}</span> · {horaStr}
        </p>
        <p className="mt-1.5 text-[13px] text-ink-2">
          {slot.reservedCount}{' '}
          {slot.reservedCount === 1
            ? 'aluno reservado'
            : 'alunos reservados'}{' '}
          · todos serão avisados e recebem o crédito de volta.
        </p>

        <div className="mt-6">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
            motivo
          </span>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setReason(r.k)}
                className={`rounded-xs border-[1.5px] px-3 py-3 text-left text-sm font-semibold transition-colors ${
                  reason === r.k
                    ? 'border-ink bg-cream-2'
                    : 'border-sand bg-cream hover:bg-cream-2'
                }`}
              >
                {r.l}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
            observação {reason === 'OUTRO' ? '' : '(opcional)'}
          </span>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            placeholder="recado pros alunos…"
            className="w-full resize-y rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm focus:border-ink focus:bg-white focus:outline-none"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-lg bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-[1.5px] border-ink px-4 py-2.5 text-sm font-semibold"
          >
            voltar
          </button>
          <button
            type="submit"
            disabled={!reason || cancelMut.isPending}
            className="rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-cream disabled:bg-sand"
          >
            {cancelMut.isPending ? 'cancelando...' : 'cancelar aula'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
