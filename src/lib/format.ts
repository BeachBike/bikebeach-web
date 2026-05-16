/// pt-BR helpers for the customer-facing UI. Everything that turns raw API
/// values into display strings lives here so screens stay declarative.

const WEEKDAY_PT: Record<number, string> = {
  0: 'dom',
  1: 'seg',
  2: 'ter',
  3: 'qua',
  4: 'qui',
  5: 'sex',
  6: 'sáb',
};

export function formatGreeting(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'bom dia';
  if (hour < 18) return 'boa tarde';
  return 'boa noite';
}

/// Returns the first name in Title Case (first letter upper, rest lower).
/// E.g. `"LUCAS PEREIRA"` → `"Lucas"`, `"maria de oliveira"` → `"Maria"`.
/// Centralizes the rule the user expects: instructor labels never come out
/// as `"sunset com lucas"` again.
export function firstName(full: string | undefined | null): string {
  if (!full) return '';
  const raw = full.trim().split(/\s+/)[0] ?? '';
  if (!raw) return '';
  return raw[0]!.toUpperCase() + raw.slice(1).toLowerCase();
}

export function formatHourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/// "hoje" / "amanhã" / "qua" — relative-ish day label.
export function relativeDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (that.getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays >= -1 && diffDays <= 6) return WEEKDAY_PT[d.getDay()] ?? '';
  return WEEKDAY_PT[d.getDay()] ?? '';
}

/// Maps the 1–5 class-kind intensity to its named pegada level. The five
/// levels are the canonical vocabulary across the app (card meter, admin
/// form, schedule). Null / 0 falls back to the middle ("média").
export function intensityLabel(intensity: number | null | undefined): string {
  switch (Math.min(5, Math.max(1, Math.round(intensity ?? 3)))) {
    case 1:
      return 'muito fraco';
    case 2:
      return 'fraco';
    case 3:
      return 'média';
    case 4:
      return 'forte';
    default:
      return 'muito forte';
  }
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function paymentMethodLabel(
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD',
): string {
  switch (method) {
    case 'PIX':
      return 'pix';
    case 'CREDIT_CARD':
      return 'crédito';
    case 'DEBIT_CARD':
      return 'débito';
  }
}

/// Initials like "MV" for "Marina Vasques". Uppercase, max 2 chars.
export function initials(name: string | undefined | null): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/// Whole-day count from now → ISO. Negative when past.
export function daysUntil(iso: string): number {
  const t = new Date(iso).getTime();
  return Math.ceil((t - Date.now()) / 86_400_000);
}

/// HH:MM:SS countdown to a future ISO; clamped to 00:00:00 once elapsed.
export function formatCountdown(targetIso: string, now: number = Date.now()) {
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/// Adaptive countdown for the professor dashboard: when the gap is wider
/// than 24h we show `Xd Yh` (no need for second-level precision). Below
/// 24h we drop into HH:MM:SS so the page acts like a real countdown clock
/// the closer the class gets.
export function formatCountdownSmart(
  targetIso: string,
  now: number = Date.now(),
) {
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  if (diff >= 86_400_000) {
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    return `${days}d ${String(hours).padStart(2, '0')}h`;
  }
  return formatCountdown(targetIso, now);
}
