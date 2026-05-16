import { useMemo, useState } from 'react';
import {
  type AdminClassSlot,
  useAdminClassSlots,
} from '@/api/admin';
import type { Me } from '@/api/me';
import { Pagination, usePagination } from '@/components/common';
import { useArenaStore } from '@/stores/arena';
import { SlotList } from './dashboard';

interface AgendaTabProps {
  me: Me;
  onOpenCreateClass: () => void;
  onOpenCancel: (slot: AdminClassSlot) => void;
}

/// F5 (28.2) — filter axes mapped to ClassSlotStatus + run-window state.
/// `confirmada`  = SCHEDULED + future (still on the calendar)
/// `realizada`   = COMPLETED
/// `cancelada`   = CANCELLED_BEFORE
/// `cancelada-ao-vivo` = CANCELLED_DURING
/// `tudo`        = no filter
type Filter =
  | 'confirmada'
  | 'realizada'
  | 'cancelada'
  | 'cancelada-ao-vivo'
  | 'tudo';

const FILTERS: ReadonlyArray<[Filter, string]> = [
  ['confirmada', 'confirmadas'],
  ['realizada', 'realizadas'],
  ['cancelada', 'canceladas'],
  ['cancelada-ao-vivo', 'canc. ao vivo'],
  ['tudo', 'tudo'],
];

export function AgendaTab({
  me,
  onOpenCreateClass,
  onOpenCancel,
}: AgendaTabProps) {
  const range = wideRange();
  const selectedArena = useArenaStore((s) => s.selectedArenaId);
  const slotsQ = useAdminClassSlots(
    selectedArena === 'all' ? me.unitId ?? undefined : selectedArena,
    range.from,
    range.to,
  );
  const [filter, setFilter] = useState<Filter>('confirmada');

  const items = useMemo(() => {
    const all = (slotsQ.data ?? [])
      .filter((s) => s.instructorId === me.id)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    const now = new Date();
    if (filter === 'confirmada') {
      return all.filter(
        (s) => s.status === 'SCHEDULED' && new Date(s.startsAt) > now,
      );
    }
    if (filter === 'realizada') {
      return all.filter((s) => s.status === 'COMPLETED').reverse();
    }
    if (filter === 'cancelada') {
      return all.filter((s) => s.status === 'CANCELLED_BEFORE').reverse();
    }
    if (filter === 'cancelada-ao-vivo') {
      return all.filter((s) => s.status === 'CANCELLED_DURING').reverse();
    }
    return all.reverse();
  }, [slotsQ.data, me.id, filter]);

  const counts = useMemo(() => {
    const all = (slotsQ.data ?? []).filter((s) => s.instructorId === me.id);
    const now = new Date();
    return {
      confirmada: all.filter(
        (s) => s.status === 'SCHEDULED' && new Date(s.startsAt) > now,
      ).length,
      realizada: all.filter((s) => s.status === 'COMPLETED').length,
      cancelada: all.filter((s) => s.status === 'CANCELLED_BEFORE').length,
      'cancelada-ao-vivo': all.filter(
        (s) => s.status === 'CANCELLED_DURING',
      ).length,
      tudo: all.length,
    } as Record<Filter, number>;
  }, [slotsQ.data, me.id]);

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } =
    usePagination(items, 6);

  return (
    <div className="fadein">
      <section className="pb-2 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-clay">minha agenda</div>
            <div
              className="display-tight mt-1.5 leading-[.95]"
              style={{ fontSize: 'clamp(28px,6vw,72px)' }}
            >
              minhas aulas.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCreateClass}
            className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-3.5 text-sm font-semibold text-cream shadow-[0_12px_28px_-14px_rgba(216,93,52,.5)]"
          >
            <PlusIcon /> nova aula
          </button>
        </div>
      </section>

      <div className="mb-4 mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map(([k, l]) => {
          const active = filter === k;
          const count = counts[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? 'bg-ink text-cream'
                  : 'bg-cream-2 text-ink hover:bg-sand/60'
              }`}
            >
              {l}
              <span
                className={`rounded-full px-1.5 text-[11px] font-bold ${
                  active
                    ? 'bg-cream/20 text-cream'
                    : 'bg-cream text-ink-2'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {slotsQ.isLoading ? (
        <div className="text-ink-2">Carregando...</div>
      ) : (
        <>
          <SlotList items={pageItems} onCancel={onOpenCancel} />
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
  );
}

function wideRange() {
  // 60 days back, 90 days forward — keeps the "histórico" + "próximas" tabs
  // useful without paging.
  const start = new Date();
  start.setDate(start.getDate() - 60);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 90);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
