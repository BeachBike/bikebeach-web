/// Card-form helpers. Pure functions, no state, no network — designed so
/// the card form stays a thin shell over them.

export function digitsOnly(v: string): string {
  return v.replace(/\D+/g, '');
}

/// Max digits per brand. Defaults to 16 (Visa/Master/Elo/Hipercard — the
/// Brazilian majority); Amex is the only common 15. Used by the input mask
/// so the user can't type past the real length of the card.
export function cardMaxLength(v: string): number {
  return detectCardBrand(v) === 'AMEX' ? 15 : 16;
}

/// "4111111111111111" → "4111 1111 1111 1111". Caps at the detected
/// brand's length so the field doesn't accept extra digits. Amex prints
/// in 4-6-5 groups; for simplicity we group every 4 — it stays readable.
export function maskCardNumber(v: string): string {
  const digits = digitsOnly(v).slice(0, cardMaxLength(v));
  return digits.replace(/(\d{4})/g, '$1 ').trim();
}

/// "1226" → "12/26". Used by the in-form expiry field which is the more
/// natural MM/YY UX; the API converts to MM + 20YY at submit.
export function maskExpiry(v: string): string {
  const d = digitsOnly(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function maskCpf(v: string): string {
  const d = digitsOnly(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCep(v: string): string {
  const d = digitsOnly(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/// Brazilian phone — "(47) 99999-0000" for 11 digits, "(47) 9999-0000" for 10.
export function maskPhone(v: string): string {
  const d = digitsOnly(v).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/// Coarse brand detection from the BIN. Used only to swap the card-preview
/// logo while typing — Asaas does the real authoritative detection
/// server-side. Returns null for unknown / too-short input.
export function detectCardBrand(
  rawNumber: string,
): 'VISA' | 'MASTERCARD' | 'AMEX' | 'ELO' | 'HIPERCARD' | null {
  const d = digitsOnly(rawNumber);
  if (d.length < 2) return null;
  if (/^4/.test(d)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
  if (/^3[47]/.test(d)) return 'AMEX';
  if (/^(4011|4312|4389|4514|4573|5041|5067|5090|6277|6362|6363|6504|6505|6509|6516|6550)/.test(d))
    return 'ELO';
  if (/^(606282|3841)/.test(d)) return 'HIPERCARD';
  return null;
}

/// Splits the masked "MM/YY" or "MM/YYYY" into the { MM, YYYY } the API
/// expects. Always emits a 4-digit year — UI accepts 2-digit, we add the
/// "20" prefix. Returns null for incomplete input.
export function splitExpiry(
  masked: string,
): { expiryMonth: string; expiryYear: string } | null {
  const d = digitsOnly(masked);
  if (d.length !== 4 && d.length !== 6) return null;
  const month = d.slice(0, 2);
  const year = d.length === 4 ? `20${d.slice(2)}` : d.slice(2);
  return { expiryMonth: month, expiryYear: year };
}

/// Luhn check — cheap client-side sanity gate. The backend re-validates
/// with `@IsCreditCard()` and Asaas re-validates on top.
export function isValidLuhn(rawNumber: string): boolean {
  const d = digitsOnly(rawNumber);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let n = parseInt(d[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/// True if "MM/YY"/"MM/YYYY" is a valid month in the future. Strict — the
/// last day of the expiry month is treated as still valid (cards work
/// through the end of the month).
export function isExpiryInFuture(masked: string): boolean {
  const split = splitExpiry(masked);
  if (!split) return false;
  const m = parseInt(split.expiryMonth, 10);
  const y = parseInt(split.expiryYear, 10);
  if (m < 1 || m > 12) return false;
  // End-of-month of the expiry — Date with day=0 of next month.
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
  return endOfMonth.getTime() >= Date.now();
}
