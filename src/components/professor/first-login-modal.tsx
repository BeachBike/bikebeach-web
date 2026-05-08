import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useChangePassword } from '@/api/professor';

interface FirstLoginModalProps {
  firstName: string;
}

/// Force-shown modal when `me.mustChangePassword` is true. Cannot be dismissed
/// by clicking outside — staff must change the temp password before doing
/// anything else in the portal.
export function FirstLoginModal({ firstName }: FirstLoginModalProps) {
  const [current, setCurrent] = useState('');
  const [next1, setNext1] = useState('');
  const [next2, setNext2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const change = useChangePassword();

  const okMatch = next1.length >= 8 && next1 === next2;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) return setError('Informe a senha temporária que você recebeu.');
    if (next1.length < 8)
      return setError('A nova senha precisa ter no mínimo 8 caracteres.');
    if (next1 !== next2) return setError('As senhas não conferem.');
    try {
      await change.mutateAsync({
        currentPassword: current,
        newPassword: next1,
      });
    } catch (err) {
      setError(extractMessage(err) ?? 'Não conseguimos trocar a senha.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-ink/55 px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-3xl bg-cream shadow-2xl"
        style={{ animation: 'slidein .35s cubic-bezier(.2,.7,.2,1) both' }}
      >
        <div className="relative overflow-hidden bg-clay px-7 py-7 text-cream">
          <div
            className="absolute -right-16 -top-16 size-52 rounded-full bg-sun opacity-40"
            aria-hidden
          />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-wide opacity-85">
              boas-vindas
            </div>
            <div className="display-tight mt-1.5 text-[34px] leading-[1]">
              oi {firstName.toLowerCase()},
              <br />
              vamos pedalar?
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 px-7 py-6">
          <p className="text-sm leading-relaxed text-ink-2">
            Esse é seu primeiro acesso. Crie uma <b>nova senha</b> para trocar
            a temporária que o admin enviou.
          </p>

          <FieldLabel
            label="senha temporária"
            value={current}
            onChange={setCurrent}
            placeholder="a senha que o admin te passou"
            type="password"
          />

          <FieldLabel
            label="nova senha"
            value={next1}
            onChange={setNext1}
            placeholder="mínimo 8 caracteres"
            type="password"
          />

          <FieldLabel
            label="confirmar nova senha"
            value={next2}
            onChange={setNext2}
            type="password"
            error={
              next2 && next1 !== next2
                ? '↳ as senhas não batem'
                : undefined
            }
          />

          {error && (
            <div className="rounded-lg bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!okMatch || change.isPending}
            className="mt-2 w-full rounded-full bg-ink px-5 py-4 text-base font-semibold text-cream transition-colors disabled:cursor-not-allowed disabled:bg-sand"
          >
            {change.isPending ? 'trocando...' : 'entrar no portal →'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function FieldLabel({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium focus:border-ink focus:bg-white focus:outline-none"
      />
      {error && (
        <span className="mt-1 block text-xs text-clay-d">{error}</span>
      )}
    </label>
  );
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
