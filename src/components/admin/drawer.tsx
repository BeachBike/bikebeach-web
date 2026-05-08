import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { maskPrice } from '@/lib/masks';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/// Right-side slide-in modal used across admin tabs (create/edit forms).
/// Rendered via Portal so it breaks out of parent containers.
/// Closes on backdrop click and on Esc.
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Fechar"
      />
      <div className="relative flex h-full w-full max-w-[520px] flex-col bg-cream shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between border-b border-sand bg-cream px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="display-tight text-[26px] leading-tight text-ink">
              {title}
            </div>
            {subtitle && (
              <div className="mt-1 text-sm text-ink-2">{subtitle}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex-shrink-0 rounded-full p-2 text-ink-2 transition-colors hover:bg-cream-2 hover:text-ink"
            aria-label="Fechar drawer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-0 top-0 mt-0.5 text-xs font-semibold text-clay-d">
            ⚠ {error}
          </div>
        )}
      </div>
      {!error && hint && (
        <span className="block text-xs text-ink-3">{hint}</span>
      )}
      {error && (
        <span className="block text-xs text-clay-d">{error}</span>
      )}
    </label>
  );
}

export function TextInput({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none ${className}`}
    />
  );
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none ${className}`}
    >
      {children}
    </select>
  );
}

export function TextArea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none resize-none ${className}`}
    />
  );
}

export function PriceInput({
  value,
  onChange,
  className = '',
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-0 top-0 flex h-full items-center pl-3.5 text-sm font-semibold text-ink-2">
        R$
      </span>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const masked = maskPrice(e.target.value);
          onChange(masked);
        }}
        className={`w-full rounded-lg border-[1.5px] border-sand bg-cream pl-10 pr-3.5 py-3 text-sm font-medium transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none ${className}`}
      />
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  className = '',
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        let v = e.target.value;
        if (min !== undefined) {
          const minVal = typeof min === 'string' ? parseInt(min, 10) : min;
          if (!isNaN(minVal) && parseInt(v, 10) < minVal) v = String(minVal);
        }
        if (max !== undefined) {
          const maxVal = typeof max === 'string' ? parseInt(max, 10) : max;
          if (!isNaN(maxVal) && parseInt(v, 10) > maxVal) v = String(maxVal);
        }
        onChange(v);
      }}
      min={min}
      max={max}
      className={`w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium tabular-nums transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none ${className}`}
    />
  );
}
