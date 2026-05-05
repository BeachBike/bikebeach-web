import type { CreditPack, Reservation } from '@/api/me';
import {
  daysUntil,
  formatHourMinute,
  relativeDayLabel,
} from '@/lib/format';

interface Props {
  packs: CreditPack[] | undefined;
  reservations: Reservation[] | undefined;
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  tone: 'clay' | 'cream' | 'ink';
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // Monday-first week
  const day = x.getDay();
  const offset = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - offset);
  return x;
}

export function KPIs({ packs, reservations }: Props) {
  const now = new Date();

  // 1. Aulas restantes — sum across active packs.
  const activePacks = (packs ?? []).filter(
    (p) =>
      p.remainingCredits > 0 &&
      (!p.expiresAt || new Date(p.expiresAt) > now),
  );
  const remaining = activePacks.reduce(
    (acc, p) => acc + p.remainingCredits,
    0,
  );
  const mainPack = [...activePacks].sort(
    (a, b) => b.remainingCredits - a.remainingCredits,
  )[0];

  // 2. Vence em — soonest expiring active pack.
  const soonest = [...activePacks]
    .filter((p) => p.expiresAt)
    .sort(
      (a, b) =>
        new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime(),
    )[0];
  const venceDays = soonest ? daysUntil(soonest.expiresAt!) : null;

  // 3. Essa semana — attended classes (CHECKED_IN or COMPLETED) since Mon.
  const weekStart = startOfWeek(now);
  const weekDone = (reservations ?? []).filter(
    (r) =>
      (r.status === 'CHECKED_IN' || r.status === 'COMPLETED') &&
      new Date(r.classSlot.startsAt) >= weekStart,
  ).length;

  // 4. Próxima aula — earliest upcoming non-cancelled reservation.
  const upcoming = (reservations ?? [])
    .filter(
      (r) =>
        (r.status === 'ACTIVE' || r.status === 'CHECKED_IN') &&
        new Date(r.classSlot.startsAt) > now,
    )
    .sort(
      (a, b) =>
        new Date(a.classSlot.startsAt).getTime() -
        new Date(b.classSlot.startsAt).getTime(),
    )[0];

  const items: KPI[] = [
    {
      label: 'aulas restantes',
      value: remaining > 0 ? String(remaining) : '—',
      sub:
        mainPack?.source === 'SUBSCRIPTION_CYCLE'
          ? 'do plano mensal'
          : mainPack
            ? `do pacote ${mainPack.totalCredits}`
            : 'compre um pacote',
      tone: 'clay',
    },
    {
      label: 'vence em',
      value: venceDays !== null && venceDays > 0 ? String(venceDays) : '—',
      sub:
        venceDays !== null
          ? venceDays === 1
            ? 'dia'
            : 'dias'
          : 'sem expiração',
      tone: 'cream',
    },
    {
      label: 'essa semana',
      value: String(weekDone),
      sub: weekDone === 1 ? 'aula feita' : 'aulas feitas',
      tone: 'cream',
    },
    {
      label: 'próxima aula',
      value: upcoming
        ? relativeDayLabel(upcoming.classSlot.startsAt)
        : '—',
      sub: upcoming
        ? `${formatHourMinute(upcoming.classSlot.startsAt)} · ${
            upcoming.classSlot.classKind?.name?.toLowerCase() ??
            upcoming.classSlot.title ??
            'aula'
          }`
        : 'sem reserva',
      tone: 'ink',
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {items.map((it) => {
        const isClay = it.tone === 'clay';
        const isInk = it.tone === 'ink';
        const bg = isClay
          ? 'var(--color-clay)'
          : isInk
            ? 'var(--color-ink)'
            : 'var(--color-cream-2)';
        const fg =
          isClay || isInk ? 'var(--color-cream)' : 'var(--color-ink)';
        return (
          <div
            key={it.label}
            className="flex min-h-[130px] flex-col justify-between rounded-2xl px-5 py-5"
            style={{ background: bg, color: fg }}
          >
            <span className="text-xs font-semibold opacity-85">
              {it.label}
            </span>
            <div>
              <div
                className="display-tight mt-1.5"
                style={{ fontSize: 48, lineHeight: 1 }}
              >
                {it.value}
              </div>
              <div className="mt-1 text-[13px] font-medium opacity-85">
                {it.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
