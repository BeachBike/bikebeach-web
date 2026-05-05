/// Input masks. Each `mask*` returns the formatted *display* value; pair
/// with `digitsOnly` (or split helpers) when you need the raw value to send
/// to the API.

export function digitsOnly(v: string): string {
  return v.replace(/\D/g, '');
}

export function maskPhone(v: string): string {
  const d = digitsOnly(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCpf(v: string): string {
  const d = digitsOnly(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskBirth(v: string): string {
  const d = digitsOnly(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/// dd/mm/aaaa → yyyy-mm-dd (ISO date). Returns undefined if input isn't 8
/// digits; caller decides whether that's valid.
export function birthToIsoDate(v: string): string | undefined {
  const d = digitsOnly(v);
  if (d.length !== 8) return undefined;
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yyyy = d.slice(4);
  return `${yyyy}-${mm}-${dd}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
