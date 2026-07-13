import { useState } from 'react';
import { formatFullDate } from '@/lib/format';

interface Props {
  valid: boolean;
  acceptedAt: string | null;
  expiresAt: string | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onAccept: () => void;
}

const TERMS = [
  'Reconheço que atividade física tem riscos inerentes e que pratico por escolha própria.',
  'Confirmo que avaliei minha condição de saúde e que estou apto(a) a fazer aulas de spinning na areia.',
  'Comprometo-me a avisar a equipe antes da aula sobre qualquer condição médica relevante (lesão, gravidez, medicação contínua).',
  'Concordo que a bikebeach não se responsabiliza por lesões decorrentes de omissão sobre minha condição de saúde.',
] as const;

export function LiabilityCard({
  valid,
  acceptedAt,
  expiresAt,
  isSubmitting,
  errorMessage,
  onAccept,
}: Props) {
  const [agreed, setAgreed] = useState(valid);
  // When already valid, start collapsed as a small summary so the page
  // shrinks after the user is done (2.2). "atualizar" expands the full
  // terms again. The parent re-mounts this card on a new acceptedAt, so
  // re-accepting collapses back automatically.
  const [editing, setEditing] = useState(false);
  const isExpired = !!acceptedAt && !valid;

  if (valid && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border-[1.5px] border-sand bg-cream px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold text-cream"
            style={{ background: 'var(--color-success)' }}
          >
            ✓
          </span>
          <div>
            <div className="text-[13px] font-bold text-ink">
              termo de responsabilidade em dia
            </div>
            <div className="text-[12px] text-ink-2">
              aceito em {formatFullDate(acceptedAt!)}
              {expiresAt && <> · vale até {formatFullDate(expiresAt)}</>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border-[1.5px] border-sand px-4 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
        >
          ver / atualizar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border-[1.5px] border-sand bg-cream p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-clay">
            termo de responsabilidade
          </div>
          <h2
            className="display-tight mt-1.5"
            style={{ fontSize: 28, lineHeight: 1.05 }}
          >
            seu de-acordo mensal
          </h2>
        </div>
        <StatusPill valid={valid} expired={isExpired} />
      </div>

      <ul className="mt-5 flex list-none flex-col gap-3">
        {TERMS.map((t) => (
          <li key={t} className="flex gap-3 text-[14px] leading-snug text-ink-2">
            <span className="mt-0.5 flex-shrink-0 font-bold text-clay">☼</span>
            {t}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-cream-2 px-4 py-3.5">
        <button
          type="button"
          aria-pressed={agreed}
          onClick={() => setAgreed((v) => !v)}
          className="mt-0.5 grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-all"
          style={{
            borderColor: agreed
              ? 'var(--color-ink)'
              : 'var(--color-sand)',
            background: agreed ? 'var(--color-ink)' : 'transparent',
          }}
        >
          {agreed && <span className="text-xs font-bold text-cream">✓</span>}
        </button>
        <span className="flex-1 text-sm font-medium leading-snug">
          li e concordo com os termos acima.
        </span>
      </label>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-ink-3">
          {acceptedAt ? (
            <>
              último aceite: {formatFullDate(acceptedAt)}
              {expiresAt && (
                <>
                  {' '}
                  · expira em <b>{formatFullDate(expiresAt)}</b>
                </>
              )}
            </>
          ) : (
            'primeira vez por aqui — leva 3 segundos.'
          )}
        </div>
        <button
          type="button"
          onClick={onAccept}
          disabled={!agreed || isSubmitting}
          className="rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-cream transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? 'salvando…'
            : valid
              ? 'reaceitar'
              : 'aceitar e seguir →'}
        </button>
      </div>
    </div>
  );
}

function StatusPill({
  valid,
  expired,
}: {
  valid: boolean;
  expired: boolean;
}) {
  if (valid) {
    return (
      <span
        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: 'var(--color-success)',
          color: 'var(--color-cream)',
        }}
      >
        em dia
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: 'var(--color-clay-d)',
        color: 'var(--color-cream)',
      }}
    >
      {expired ? 'expirado' : 'pendente'}
    </span>
  );
}
