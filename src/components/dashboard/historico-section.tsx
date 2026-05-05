import type { Reservation } from '@/api/me';
import {
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

const ATTENDED: ReadonlyArray<Reservation['status']> = [
  'CHECKED_IN',
  'COMPLETED',
];

function isAttended(r: Reservation): boolean {
  return ATTENDED.includes(r.status);
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
  const past = (reservations ?? [])
    .filter(isAttended)
    .sort(
      (a, b) =>
        new Date(b.classSlot.startsAt).getTime() -
        new Date(a.classSlot.startsAt).getTime(),
    );

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
            stats.topInstructor?.name?.split(' ')[0]?.toLowerCase() ?? '—'
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
          <div className="flex flex-col gap-2">
            {past.map((r) => (
              <HistoricoRow key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function HistoricoRow({ r }: { r: Reservation }) {
  const slot = r.classSlot;
  const titulo = slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  return (
    <div className="grid grid-cols-1 items-center gap-3.5 rounded-2xl border border-sand bg-cream px-5 py-4 lg:grid-cols-[100px_1fr_140px_120px_100px]">
      <span className="text-sm font-semibold text-ink-2">
        {formatFullDate(slot.startsAt)}
      </span>
      <span
        className="display-tight"
        style={{ fontSize: 22, lineHeight: 1.1 }}
      >
        {titulo}
      </span>
      <span className="text-sm">
        com {slot.instructor.name.split(' ')[0]?.toLowerCase()}
      </span>
      <span className="text-[13px] text-ink-2">
        {slot.durationMinutes} min ·{' '}
        {intensityLabel(slot.classKind?.intensity)}
      </span>
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: 'var(--color-sea)' }}
      >
        {r.status === 'COMPLETED' ? 'concluída ✓' : 'check-in ✓'}
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
