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

/// Máscara de preço: "1234" → "12,34", "12345" → "123,45", "1234567" → "12.345,67"
/// Recebe string de dígitos (ou já com pontuação — só os dígitos contam) e
/// retorna formato pt-BR com separador de milhar.
export function maskPrice(v: string): string {
  const d = digitsOnly(v).slice(0, 10); // max 99.999.999,99 (10 dígitos)
  if (d.length === 0) return '';
  if (d.length === 1) return `0,0${d}`;
  if (d.length === 2) return `0,${d}`;
  const intPart = d.slice(0, -2);
  const decPart = d.slice(-2);
  // Separador de milhar (.) — `\B(?=(\d{3})+(?!\d))` insere antes de cada
  // grupo de 3 dígitos contado da direita. Sem `\B` o regex tenta inserir
  // no início da string.
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intWithDots},${decPart}`;
}

/// Preço com máscara "12,34" ou "1.234,56" → 1234 / 123456 (cents).
/// Retorna undefined se input vazio.
export function priceTocents(masked: string): number | undefined {
  const d = digitsOnly(masked);
  if (d.length === 0) return undefined;
  // Garante 2 casas decimais (centavos)
  const padded = d.padStart(3, '0');
  const cents = parseInt(padded, 10);
  return cents;
}

/// Centavos (number) → "1.234,56". Para render fora de forms (cards, listas).
export function centsToMaskedPrice(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return '';
  return maskPrice(String(Math.round(cents)));
}

/// Decimal pt-BR enquanto o usuário digita: "12345" → "12345", "12345,6" stays,
/// "12.34" mantém só dígitos+vírgula. Útil para taxas, distâncias, etc.
export function maskDecimal(v: string, decimals = 2): string {
  // Dígitos + uma única vírgula
  const stripped = v.replace(/[^0-9,]/g, '');
  const parts = stripped.split(',');
  if (parts.length === 1) return parts[0];
  const head = parts[0];
  const tail = parts.slice(1).join('').slice(0, decimals);
  return `${head},${tail}`;
}

/// "12,34" → 12.34. Retorna NaN para input vazio/inválido.
export function decimalStringToNumber(v: string): number {
  if (!v) return NaN;
  return parseFloat(v.replace(/\./g, '').replace(',', '.'));
}
