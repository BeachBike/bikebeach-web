import { useEffect, useState, type InputHTMLAttributes } from 'react';
import {
  centsToMaskedPrice,
  decimalStringToNumber,
  digitsOnly,
  maskDecimal,
  maskPrice,
  priceTocents,
} from '@/lib/masks';

/// Shared input base — same styling everyone in the codebase already uses.
/// Keep this in sync with `web/src/components/admin/drawer.tsx` TextInput.
const BASE_INPUT_CLASS =
  'w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium transition-all duration-200 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

type CommonProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
>;

// ---------------------------------------------------------------------------
// InputNumber — integer with min/max
// ---------------------------------------------------------------------------

interface InputNumberProps extends CommonProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}

export function InputNumber({
  value,
  onChange,
  min,
  max,
  className = '',
  onBlur,
  ...rest
}: InputNumberProps) {
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));

  // External `value` change (parent form reset) → re-sync.
  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => {
        const digits = digitsOnly(e.target.value);
        if (digits === '') {
          setDraft('');
          onChange(null);
          return;
        }
        let n = parseInt(digits, 10);
        if (max !== undefined && n > max) n = max;
        setDraft(String(n));
        onChange(n);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        if (draft === '') return;
        let n = parseInt(draft, 10);
        if (Number.isNaN(n)) return;
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        setDraft(String(n));
        onChange(n);
      }}
      className={`${BASE_INPUT_CLASS} ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// InputDecimal — float with pt-BR comma
// ---------------------------------------------------------------------------

interface InputDecimalProps extends CommonProps {
  value: number | null;
  onChange: (value: number | null) => void;
  decimals?: number;
  min?: number;
  max?: number;
}

export function InputDecimal({
  value,
  onChange,
  decimals = 2,
  min,
  max,
  className = '',
  onBlur,
  ...rest
}: InputDecimalProps) {
  const [draft, setDraft] = useState<string>(
    value === null ? '' : numberToDecimalString(value, decimals),
  );

  useEffect(() => {
    setDraft(value === null ? '' : numberToDecimalString(value, decimals));
  }, [value, decimals]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        const masked = maskDecimal(e.target.value, decimals);
        setDraft(masked);
        const parsed = decimalStringToNumber(masked);
        if (Number.isNaN(parsed)) {
          onChange(null);
          return;
        }
        let n = parsed;
        if (max !== undefined && n > max) n = max;
        onChange(n);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        const parsed = decimalStringToNumber(draft);
        if (Number.isNaN(parsed)) return;
        let n = parsed;
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        const next = numberToDecimalString(n, decimals);
        setDraft(next);
        onChange(n);
      }}
      className={`${BASE_INPUT_CLASS} ${className}`}
    />
  );
}

function numberToDecimalString(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',');
}

// ---------------------------------------------------------------------------
// InputMoney — value in cents, displays "R$ 1.234,56"
// ---------------------------------------------------------------------------

interface InputMoneyProps extends CommonProps {
  /** Value in cents (integer). null when empty. */
  value: number | null;
  onChange: (cents: number | null) => void;
  min?: number;
  max?: number;
}

export function InputMoney({
  value,
  onChange,
  min,
  max,
  className = '',
  onBlur,
  ...rest
}: InputMoneyProps) {
  const [draft, setDraft] = useState<string>(
    value === null || value === undefined ? '' : centsToMaskedPrice(value),
  );

  useEffect(() => {
    setDraft(
      value === null || value === undefined ? '' : centsToMaskedPrice(value),
    );
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-0 top-0 flex h-full items-center pl-3.5 text-sm font-semibold text-ink-2">
        R$
      </span>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          const masked = maskPrice(e.target.value);
          setDraft(masked);
          const cents = priceTocents(masked);
          if (cents === undefined) {
            onChange(null);
            return;
          }
          let c = cents;
          if (max !== undefined && c > max) c = max;
          onChange(c);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          const cents = priceTocents(draft);
          if (cents === undefined) return;
          let c = cents;
          if (min !== undefined && c < min) c = min;
          if (max !== undefined && c > max) c = max;
          setDraft(centsToMaskedPrice(c));
          onChange(c);
        }}
        className={`${BASE_INPUT_CLASS} pl-10 ${className}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// InputPercent — integer 0-100 with % suffix
// ---------------------------------------------------------------------------

interface InputPercentProps extends CommonProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}

export function InputPercent({
  value,
  onChange,
  min = 0,
  max = 100,
  className = '',
  onBlur,
  ...rest
}: InputPercentProps) {
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));

  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);

  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => {
          const digits = digitsOnly(e.target.value);
          if (digits === '') {
            setDraft('');
            onChange(null);
            return;
          }
          let n = parseInt(digits, 10);
          if (n > max) n = max;
          setDraft(String(n));
          onChange(n);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          if (draft === '') return;
          let n = parseInt(draft, 10);
          if (Number.isNaN(n)) return;
          if (n < min) n = min;
          if (n > max) n = max;
          setDraft(String(n));
          onChange(n);
        }}
        className={`${BASE_INPUT_CLASS} pr-9 ${className}`}
      />
      <span className="pointer-events-none absolute right-0 top-0 flex h-full items-center pr-3.5 text-sm font-semibold text-ink-2">
        %
      </span>
    </div>
  );
}
