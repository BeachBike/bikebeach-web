import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type AdminClassSlot,
  type StudioCancelReason,
  useCancelClassSlot,
} from '@/api/admin';

interface LiveCancelModalProps {
  open: boolean;
  slot: AdminClassSlot | null;
  onClose: () => void;
  onCancelled?: () => void;
}

interface ReasonOption {
  k: StudioCancelReason;
  l: string;
  ic: string;
}

const REASONS: ReasonOption[] = [
  { k: 'CHUVA', l: 'chuva', ic: '☂' },
  { k: 'VENTO', l: 'vento forte', ic: '≈' },
  { k: 'RAIO', l: 'trovoada / raio', ic: '⚡' },
  { k: 'TECNICO', l: 'problema técnico', ic: '⚙' },
  { k: 'BAIXA_ADESAO', l: 'baixa adesão', ic: '👥' },
];

/// Two-step emergency cancel during a live class. Dark immersive backdrop
/// with rain animation. Backend marks `CANCELLED_DURING` because the slot
/// is in progress; full refund to all students.
export function LiveCancelModal({
  open,
  slot,
  onClose,
  onCancelled,
}: LiveCancelModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<ReasonOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelMut = useCancelClassSlot();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setReason(null);
    setError(null);
    cancelMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !slot) return null;

  const confirm = async () => {
    if (!reason) return;
    setError(null);
    try {
      await cancelMut.mutateAsync({
        id: slot.id,
        kind: 'STUDIO',
        studioReason: reason.k,
      });
      onClose();
      onCancelled?.();
    } catch (err) {
      setError(extractMessage(err) ?? 'Não conseguimos cancelar agora.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden px-6 py-10"
      style={{ background: '#0A0E1A', animation: 'fadein .25s ease both' }}
    >
      <Rain />
      <Lightning />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-[2] w-full max-w-[560px] overflow-hidden rounded-[28px] bg-cream shadow-[0_40px_100px_rgba(0,0,0,.6)]"
        style={{ animation: 'slidein .3s cubic-bezier(.2,.7,.2,1) both' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[3] rounded-full p-2 text-ink-2 hover:bg-cream-2"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>

        {step === 1 && (
          <div className="px-8 py-8">
            <div className="flex items-center gap-2.5 text-clay">
              <RainIcon />
              <span className="text-[11px] font-bold uppercase tracking-[.06em]">
                cancelamento de emergência
              </span>
            </div>
            <div className="display-tight mt-2.5 text-[36px] leading-none">
              o que está
              <br />
              <span className="font-normal italic text-clay">
                acontecendo?
              </span>
            </div>
            <div className="mt-2.5 text-sm text-ink-2">
              {slot.reservedCount} alunos na arena ·{' '}
              {slot.classKind?.name ?? slot.title ?? 'aula'}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {REASONS.map((r) => (
                <button
                  key={r.k}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setStep(2);
                  }}
                  className="flex items-center gap-3.5 rounded-2xl border-2 border-sand bg-cream px-4 py-5 text-left transition-colors hover:border-clay hover:bg-cream-2"
                >
                  <span className="grid size-12 place-items-center rounded-[12px] bg-cream-2 text-2xl">
                    {r.ic}
                  </span>
                  <span className="display-tight text-[18px]">{r.l}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-lg bg-cream-2 px-3.5 py-3 text-xs leading-relaxed text-ink-2">
              ⓘ Esse cancelamento é registrado como <b>cancelado · {reason?.l ?? 'motivo'}</b>{' '}
              e devolve crédito automático aos alunos.
            </div>
          </div>
        )}

        {step === 2 && reason && (
          <div className="px-8 py-8">
            <div className="flex items-center gap-2.5 text-clay">
              <AlertIcon />
              <span className="text-[11px] font-bold uppercase tracking-[.06em]">
                confirmar · 2/2
              </span>
            </div>
            <div className="display-tight mt-2.5 text-[36px] leading-none">
              cancelar mesmo
              <br />
              <span className="font-normal italic">por {reason.l}?</span>
            </div>

            <div className="mt-6 flex flex-col gap-3.5 rounded-[14px] bg-ink px-5 py-5 text-cream">
              <div className="text-[13px] font-bold uppercase tracking-[.04em] text-sun">
                o que vai acontecer:
              </div>
              {[
                `${slot.reservedCount} alunos serão notificados quando o e-mail estiver ligado`,
                `crédito da aula volta automático pra todos os pacotes`,
                `aula marcada como "cancelada · ${reason.l}" no histórico`,
                `admin é avisado pra liberar a próxima aula`,
              ].map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                >
                  <span className="mt-0.5 font-bold text-sun">✓</span>
                  {line}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={confirm}
                disabled={cancelMut.isPending}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-clay px-5 py-5 text-base font-bold text-cream shadow-[0_16px_40px_-12px_rgba(216,93,52,.7)] disabled:opacity-60"
              >
                <AlertIcon />
                {cancelMut.isPending ? 'cancelando...' : 'sim, cancelar agora'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 text-sm font-semibold text-ink-2"
              >
                ← voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Rain() {
  // 60 streaks scattered horizontally with varied speeds/delays.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${(i * 13) % 100}%`,
            top: `-${10 + (i * 7) % 30}vh`,
            width: 1.5,
            height: `${30 + (i * 5) % 40}px`,
            background:
              'linear-gradient(180deg, transparent, rgba(180,210,230,.65))',
            animation: `rain ${0.7 + (i % 5) * 0.18}s linear infinite`,
            animationDelay: `${(i % 9) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

function Lightning() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: 'rgba(220,240,255,.3)',
        animation: 'lightning 8s linear infinite',
      }}
    />
  );
}

function RainIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
