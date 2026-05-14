import type { PublicClassSlot } from '@/api/public';
import { firstName, formatHourMinute } from '@/lib/format';

interface Props {
  slot: PublicClassSlot | null;
  isJoining: boolean;
  position: number | null; // returned after a successful join
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/// Shown when the user picks a class with 0 free spots. The position is only
/// known AFTER the backend records the entry, so initially we just sell the
/// idea and let them confirm.
export function WaitlistModal({
  slot,
  isJoining,
  position,
  errorMessage,
  onClose,
  onConfirm,
}: Props) {
  if (!slot) return null;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const profFirstName = firstName(slot.instructor.name);
  const joined = position !== null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6 backdrop-blur-sm"
      style={{
        background: 'rgba(34,28,22,.5)',
        animation: 'fadein .25s ease both',
      }}
      onClick={onClose}
    >
      <div
        className="slidein w-full max-w-[460px] overflow-hidden rounded-[24px] bg-cream shadow-[0_40px_80px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-sand bg-cream-2 px-7 py-7">
          <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
            {joined ? 'você entrou na lista' : 'aula lotada'}
          </div>
          <div
            className="display-tight mt-2"
            style={{ fontSize: 30, lineHeight: 1 }}
          >
            {joined ? 'avisamos por aqui' : 'entrar na espera?'}
          </div>
        </div>

        <div className="px-7 py-6">
          <div className="text-[15px] leading-snug text-ink-2">
            <b className="text-ink">{titulo}</b> ·{' '}
            {formatHourMinute(slot.startsAt)} · com {profFirstName}
          </div>

          {joined ? (
            <div className="mt-5 rounded-2xl bg-ink px-5 py-4 text-cream">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-sun">
                    sua posição
                  </div>
                  <div
                    className="display-tight mono mt-1"
                    style={{ fontSize: 42, lineHeight: 1 }}
                  >
                    {position}º
                  </div>
                </div>
                <div className="max-w-[180px] text-right text-xs leading-snug opacity-85">
                  ~70% das listas viram vagas.
                  <br />
                  Se ninguém abrir, seu crédito volta automático.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-sun/15 px-4 py-3 text-[13px] leading-relaxed text-[#735517]">
              <b>1 crédito reservado.</b> ele só sai do seu pacote pra valer
              se você for promovido pra reserva. Se a aula começar sem você
              entrar, o crédito volta automático.
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-7 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-[1.5px] border-ink px-5 py-3 text-sm font-semibold"
          >
            {joined ? 'fechar' : 'volta'}
          </button>
          {!joined && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isJoining}
              className="rounded-full bg-clay px-5 py-3 text-sm font-semibold text-cream disabled:opacity-60"
            >
              {isJoining ? 'entrando…' : 'entrar na lista →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
