import { cn } from '@/lib/utils';
import {
  isCommonPassword,
  isIdentityPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_CLASSES,
  MIN_PASSWORD_LENGTH,
  passwordClasses,
} from '@/lib/password-policy';

interface Props {
  password: string;
  email?: string;
  name?: string;
  className?: string;
}

/// Live password requirements, written in plain everyday language so anyone
/// — including people who aren't glued to screens all day — understands
/// exactly what to do. No jargon: each rule spells out what counts and shows
/// a concrete example, and the whole thing lights up green as the user gets
/// there. The API enforces the same policy (`lib/password-policy` mirrors
/// `api/src/common/password-policy`).
export function PasswordStrength({ password, email, name, className }: Props) {
  const len = password.length;
  const ctx = { email, name };

  const c = passwordClasses(password);
  const classCount = [c.lower, c.upper, c.digit, c.symbol].filter(
    Boolean,
  ).length;

  const lengthOk = len >= MIN_PASSWORD_LENGTH && len <= MAX_PASSWORD_LENGTH;
  const over = len > MAX_PASSWORD_LENGTH;
  const missing = Math.max(0, MIN_PASSWORD_LENGTH - len);
  const varietyOk = classCount >= MIN_PASSWORD_CLASSES;
  const identityBad = len > 0 && isIdentityPassword(password, ctx);
  const commonBad =
    len > 0 && lengthOk && varietyOk && isCommonPassword(password);

  const allGood = lengthOk && varietyOk && !identityBad && !commonBad && len > 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-sand bg-cream-2/60 p-3.5',
        className,
      )}
    >
      <div className="text-[12px] font-bold uppercase tracking-wide text-clay">
        {allGood ? 'senha boa! ✓' : 'pra sua senha ficar segura:'}
      </div>

      <ul className="mt-2.5 flex list-none flex-col gap-2">
        {/* Rule 1 — length, with a friendly live counter. */}
        <Rule ok={lengthOk}>
          <b>Tamanho:</b>{' '}
          {over ? (
            <>
              está muito longa — tire {len - MAX_PASSWORD_LENGTH} caractere
              {len - MAX_PASSWORD_LENGTH === 1 ? '' : 's'} (máximo{' '}
              {MAX_PASSWORD_LENGTH})
            </>
          ) : missing > 0 ? (
            <>
              precisa de {MIN_PASSWORD_LENGTH} no total — faltam{' '}
              <b className="text-clay-d">{missing}</b>
            </>
          ) : (
            <>ótimo, {len} caracteres</>
          )}
        </Rule>

        {/* Rule 2 — variety, spelled out with examples for each type. */}
        <li className="flex items-start gap-2.5">
          <CheckDot ok={varietyOk} />
          <div className="flex-1">
            <div className="text-[13px] leading-snug text-ink">
              <b>Misture pelo menos {MIN_PASSWORD_CLASSES} tipos</b> — você tem{' '}
              <b style={{ color: varietyOk ? 'var(--color-sea)' : 'var(--color-clay-d)' }}>
                {classCount} de 4
              </b>
              :
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <TypeItem on={c.lower} title="letra minúscula" example="a b c" />
              <TypeItem on={c.upper} title="letra MAIÚSCULA" example="A B C" />
              <TypeItem on={c.digit} title="número" example="1 2 3" />
              <TypeItem on={c.symbol} title="símbolo" example="@ # !" />
            </div>
          </div>
        </li>

        {/* Rule 3 — identity, only when it actually collides. */}
        {identityBad && (
          <Rule ok={false}>
            <b>Evite o óbvio:</b> não use seu e-mail nem seu nome como senha.
          </Rule>
        )}

        {/* Rule 4 — common password, soft warning (backend is the real gate). */}
        {commonBad && (
          <Rule ok={false}>
            <b>Muito comum:</b> essa senha é fácil de adivinhar — troque por
            outra.
          </Rule>
        )}
      </ul>

      {/* A concrete example of a good password — the most helpful thing for
          someone unsure what "mistura de tipos" even means. */}
      {!allGood && (
        <div className="mt-3 rounded-xl bg-cream px-3 py-2 text-[12px] leading-snug text-ink-2">
          <b className="text-ink">Dica:</b> junte duas palavras com um número e
          um símbolo. Ex.:{' '}
          <span className="font-mono font-semibold text-ink">SolDaPraia7!</span>
        </div>
      )}
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckDot ok={ok} />
      <span className="flex-1 text-[13px] leading-snug text-ink">
        {children}
      </span>
    </li>
  );
}

function CheckDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors"
      style={{
        background: ok ? 'var(--color-sea)' : 'var(--color-cream)',
        color: ok ? 'var(--color-cream)' : 'var(--color-ink-2)',
        border: ok ? 'none' : '1.5px solid var(--color-sand)',
      }}
      aria-hidden
    >
      {ok ? '✓' : '·'}
    </span>
  );
}

/// One of the four character-type hints — a labelled pill that turns green
/// once the password contains that type. The example chars make it obvious
/// what the label means without any prior knowledge.
function TypeItem({
  on,
  title,
  example,
}: {
  on: boolean;
  title: string;
  example: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors"
      style={{
        background: on ? 'var(--color-sea)' : 'var(--color-cream)',
        border: on ? 'none' : '1px solid var(--color-sand)',
      }}
    >
      <span
        className="text-[11px] font-bold"
        style={{ color: on ? 'var(--color-cream)' : 'var(--color-ink-2)' }}
      >
        {on ? '✓' : '○'}
      </span>
      <span className="leading-tight">
        <span
          className="block text-[11px] font-semibold"
          style={{ color: on ? 'var(--color-cream)' : 'var(--color-ink)' }}
        >
          {title}
        </span>
        <span
          className="block font-mono text-[10px]"
          style={{
            color: on ? 'var(--color-cream)' : 'var(--color-ink-2)',
            opacity: on ? 0.85 : 1,
          }}
        >
          {example}
        </span>
      </span>
    </div>
  );
}
