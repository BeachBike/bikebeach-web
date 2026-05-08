import type { Reservation } from '@/api/me';
import { Pagination, usePagination } from '@/components/common';
import {
  firstName,
  formatDayMonth,
  formatFullDate,
  intensityLabel,
} from '@/lib/format';

interface Props {
  reservations: Reservation[] | undefined;
}

interface DerivedStats {
  total: number;
  topInstructor: { name: string; count: number; topKind: string | null } | null;
  longestStreak: number;
  streakRange: { from: string; to: string } | null;
  oldestDate: string | null;
}

/// Statuses that count as "real attendance" for the streak / count stats.
const ATTENDED: ReadonlyArray<Reservation['status']> = [
  'CHECKED_IN',
  'COMPLETED',
];

/// How long a CANCELLED_BY_STUDIO reservation lingers in histórico after
/// the original startsAt before disappearing. Attended + NO_SHOW have no
/// expiry — they stay forever as part of the user's record.
const STUDIO_CANCEL_VISIBILITY_MS = 24 * 60 * 60 * 1000;

/// Display labels for the studio cancellation enum. Mirrors the values the
/// instructor / admin can pick in their cancel modals.
const STUDIO_REASON_LABEL: Record<string, string> = {
  CHUVA: 'chuva',
  VENTO: 'vento',
  RAIO: 'raio',
  TECNICO: 'problema técnico',
  MAR_ALTO: 'mar alto',
  MANUTENCAO: 'manutenção',
  SEGURANCA: 'segurança',
  BAIXA_ADESAO: 'baixa adesão',
  OUTRO: 'outro',
};

function isAttended(r: Reservation): boolean {
  return ATTENDED.includes(r.status);
}

/// Statuses surfaced in histórico:
///   - CHECKED_IN / COMPLETED / NO_SHOW: forever — part of the user's record.
///   - CANCELLED_BY_STUDIO: only for 24h after the original class time, then
///     disappears entirely (the credit is already back, no value in keeping
///     a "ghost" of a class that didn't happen).
function isInHistory(r: Reservation, now: number): boolean {
  if (
    r.status === 'CHECKED_IN' ||
    r.status === 'COMPLETED' ||
    r.status === 'NO_SHOW'
  ) {
    return true;
  }
  if (r.status === 'CANCELLED_BY_STUDIO') {
    const startMs = new Date(r.classSlot.startsAt).getTime();
    return now - startMs < STUDIO_CANCEL_VISIBILITY_MS;
  }
  return false;
}

function deriveStats(reservations: Reservation[]): DerivedStats {
  const attended = reservations
    .filter(isAttended)
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    );

  if (attended.length === 0) {
    return {
      total: 0,
      topInstructor: null,
      longestStreak: 0,
      streakRange: null,
      oldestDate: null,
    };
  }

  // Top instructor — most-attended, plus their most-frequent class kind.
  const byInstructor = new Map<
    string,
    { name: string; count: number; kinds: Map<string, number> }
  >();
  for (const r of attended) {
    const id = r.classSlot.instructor.id;
    const name = r.classSlot.instructor.name;
    const kind =
      r.classSlot.classKind?.name?.toLowerCase() ??
      r.classSlot.title ??
      'aula';
    if (!byInstructor.has(id)) {
      byInstructor.set(id, { name, count: 0, kinds: new Map() });
    }
    const entry = byInstructor.get(id)!;
    entry.count++;
    entry.kinds.set(kind, (entry.kinds.get(kind) ?? 0) + 1);
  }
  let top: DerivedStats['topInstructor'] = null;
  for (const e of byInstructor.values()) {
    if (!top || e.count > top.count) {
      const topKindEntry = [...e.kinds.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];
      top = {
        name: e.name,
        count: e.count,
        topKind: topKindEntry?.[0] ?? null,
      };
    }
  }

  // Longest streak of consecutive days that contain at least one attended class.
  const dayKeys = Array.from(
    new Set(
      attended.map((r) => {
        const d = new Date(r.classSlot.startsAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ).sort((a, b) => a - b);

  let longest = 0;
  let runStart = 0;
  let runLen = 0;
  let bestRun: { from: number; to: number } | null = null;
  for (let i = 0; i < dayKeys.length; i++) {
    if (i === 0 || dayKeys[i]! - dayKeys[i - 1]! === 86_400_000) {
      runLen = i === 0 ? 1 : runLen + 1;
      if (i === 0) runStart = dayKeys[i]!;
    } else {
      runLen = 1;
      runStart = dayKeys[i]!;
    }
    if (runLen > longest) {
      longest = runLen;
      bestRun = { from: runStart, to: dayKeys[i]! };
    }
  }

  return {
    total: attended.length,
    topInstructor: top,
    longestStreak: longest,
    streakRange: bestRun
      ? {
          from: new Date(bestRun.from).toISOString(),
          to: new Date(bestRun.to).toISOString(),
        }
      : null,
    oldestDate: attended[0]!.classSlot.startsAt,
  };
}

export function HistoricoSection({ reservations }: Props) {
  const stats = deriveStats(reservations ?? []);
  // List includes NO_SHOWs (ausência) and recent CANCELLED_BY_STUDIO so the
  // user sees what happened. Stats still use only attended — ausência and
  // cancelled don't count for "aulas no total" or streaks.
  const now = Date.now();
  const past = (reservations ?? [])
    .filter((r) => isInHistory(r, now))
    .sort(
      (a, b) =>
        new Date(b.classSlot.startsAt).getTime() -
        new Date(a.classSlot.startsAt).getTime(),
    );

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } =
    usePagination(past, 6);

  const oldestLabel = stats.oldestDate
    ? new Date(stats.oldestDate).toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      })
    : null;
  const streakRangeLabel =
    stats.streakRange && stats.longestStreak > 1
      ? `${formatDayMonth(stats.streakRange.from)} – ${formatDayMonth(stats.streakRange.to)}`
      : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          tone="clay"
          label="aulas no total"
          value={stats.total}
          sub={oldestLabel ? `desde ${oldestLabel}` : 'comece sua primeira'}
        />
        <Stat
          tone="cream"
          label="instrutor mais frequente"
          value={
            stats.topInstructor ? firstName(stats.topInstructor.name) : '—'
          }
          sub={
            stats.topInstructor
              ? `${stats.topInstructor.count} aulas${
                  stats.topInstructor.topKind
                    ? ` · ${stats.topInstructor.topKind}`
                    : ''
                }`
              : 'nenhum instrutor ainda'
          }
          big
        />
        <Stat
          tone="ink"
          label="melhor sequência"
          value={stats.longestStreak}
          sub={
            streakRangeLabel
              ? `dias seguidos · ${streakRangeLabel}`
              : 'sem sequência ainda'
          }
        />
      </div>

      <div className="mt-8">
        <h2 className="display-tight mb-3.5" style={{ fontSize: 36 }}>
          histórico de aulas
        </h2>
        {past.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-cream/50 px-6 py-10 text-center text-sm text-ink-2">
            sem aulas concluídas ainda. Sua jornada começa na primeira reserva.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {pageItems.map((r) => (
                <HistoricoRow key={r.id} r={r} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </>
        )}
      </div>
    </>
  );
}

function HistoricoRow({ r }: { r: Reservation }) {
  const slot = r.classSlot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const isAbsent = r.status === 'NO_SHOW';
  const isCancelledByStudio = r.status === 'CANCELLED_BY_STUDIO';
  const isStrike = isAbsent || isCancelledByStudio;
  const statusColor =
    isAbsent || isCancelledByStudio
      ? 'var(--color-clay-d)'
      : 'var(--color-sea)';

  const statusLabel = (() => {
    if (r.status === 'COMPLETED') return 'concluída ✓';
    if (r.status === 'CHECKED_IN') return 'check-in ✓';
    if (isCancelledByStudio) {
      const enumKey = slot.studioCancellationReason;
      const enumLabel = enumKey ? STUDIO_REASON_LABEL[enumKey] : null;
      if (enumLabel && enumLabel !== 'outro') {
        return `cancelada · ${enumLabel}`;
      }
      const free = slot.cancellationDescription?.trim();
      return free ? `cancelada · ${free}` : 'cancelada · estúdio';
    }
    // NO_SHOW: distinguish self-marked (has reason) from instructor-marked
    // (reason starts with "ausência marcada pelo professor").
    const reason = r.cancellationReason ?? '';
    if (reason.toLowerCase().includes('professor')) {
      return 'ausência · prof';
    }
    return 'ausência';
  })();

  const subline = (() => {
    if (isAbsent && r.cancellationReason) return r.cancellationReason;
    if (isCancelledByStudio && slot.cancellationDescription) {
      return slot.cancellationDescription;
    }
    return null;
  })();

  return (
    <div className="grid grid-cols-1 items-center gap-3.5 rounded-2xl border border-sand bg-cream px-5 py-4 lg:grid-cols-[100px_1fr_140px_120px_140px]">
      <span className="text-sm font-semibold text-ink-2">
        {formatFullDate(slot.startsAt)}
      </span>
      <div className="flex flex-col">
        <span
          className="display-tight"
          style={{
            fontSize: 22,
            lineHeight: 1.1,
            color: isStrike ? 'var(--color-ink-2)' : undefined,
            textDecoration: isStrike ? 'line-through' : undefined,
            textDecorationColor: 'var(--color-clay)',
          }}
        >
          {titulo}
        </span>
        {subline && (
          <span className="mt-0.5 text-[12px] italic text-ink-2">
            “{subline}”
          </span>
        )}
      </div>
      <span className="text-sm">
        com {firstName(slot.instructor.name)}
      </span>
      <span className="text-[13px] text-ink-2">
        {slot.durationMinutes} min ·{' '}
        {intensityLabel(slot.classKind?.intensity)}
      </span>
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: statusColor }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

interface StatProps {
  tone: 'clay' | 'cream' | 'ink';
  label: string;
  value: string | number;
  sub: string;
  big?: boolean;
}

function Stat({ tone, label, value, sub, big }: StatProps) {
  const isClay = tone === 'clay';
  const isInk = tone === 'ink';
  const bg = isClay
    ? 'var(--color-clay)'
    : isInk
      ? 'var(--color-ink)'
      : 'var(--color-cream-2)';
  const fg = isClay || isInk ? 'var(--color-cream)' : 'var(--color-ink)';
  return (
    <div
      className="rounded-2xl px-6 py-6"
      style={{ background: bg, color: fg }}
    >
      <div className="text-[13px] font-semibold opacity-85">{label}</div>
      <div
        className="display-tight mt-3.5"
        style={{
          fontSize: big ? 48 : 80,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[13px] font-medium opacity-85">{sub}</div>
    </div>
  );
}
