import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/// A label + input + error/hint container, matched to the prototype.
interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-clay-d">↳ {error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-2/70">{hint}</span>
      ) : null}
    </label>
  );
}

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-[14px] border-[1.5px] bg-cream px-4 py-4 text-base font-medium transition-colors focus:outline-none',
        error
          ? 'border-clay-d focus:border-clay-d'
          : 'border-sand focus:border-ink',
        className,
      )}
      {...props}
    />
  ),
);
AuthInput.displayName = 'AuthInput';

interface PasswordProps extends Omit<AuthInputProps, 'type'> {
  /// Hint shown when blurred (override default).
  placeholder?: string;
}

/// Password input with show/hide toggle, matching the prototype's pill button.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordProps>(
  ({ error, placeholder = 'ao menos 10 caracteres', ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <AuthInput
          ref={ref}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          error={error}
          className="pr-20"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:bg-cream-2"
        >
          {show ? 'esconder' : 'mostrar'}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

/// Squared checkbox (controlled). Used for "continuar conectado" + terms.
export function CheckBox({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className="mt-0.5 grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-all"
        style={{
          borderColor: checked
            ? 'var(--color-ink)'
            : error
              ? 'var(--color-clay-d)'
              : 'var(--color-sand)',
          background: checked ? 'var(--color-ink)' : 'transparent',
        }}
      >
        {checked && (
          <span className="text-xs font-bold text-cream">✓</span>
        )}
      </button>
      <span className="flex-1 text-sm leading-snug">{children}</span>
    </label>
  );
}
