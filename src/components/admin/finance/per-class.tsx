import { useMemo, useState } from 'react';
import {
  type AdminFinanceReport,
  type CreditSource,
  useAdminFinanceClass,
} from '@/api/admin';
import { Card } from '@/components/admin/ui';
import { formatCents, paymentMethodLabel } from '@/lib/format';
import { SOURCE_COLOR_CSS, SOURCE_LABEL } from './shared';

/// "Por aula" sub-tab. List of every class in the period that generated
/// revenue, with a click-to-expand panel showing the bike-by-bike
/// breakdown: who was there, which pack each one came from, what each
/// seat was worth. Detail loads on demand (per-slot query) to keep the
/// initial render light.

interface PerClassProps {
  classes: AdminFinanceReport['classesByRevenue'];
  /// Used by the empty-state copy so we don't say "esse mês" when the
  /// admin is looking at the last 7 days.
  rangeLabel: string;
}

export function PerClassView({ classes, rangeLabel }: PerClassProps) {
  const [search, setSearch] = useState('');
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const hay =
        `${c.kindName ?? ''} ${c.instructorName} ${c.unitName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [classes, search]);

  if (classes.length === 0) {
    return (
      <Card>
        <div className="text-xs font-bold uppercase tracking-wide text-clay">
          por aula
        </div>
        <div className="display-tight mt-1 text-[28px]">
          sem aulas no período
        </div>
        <p className="mt-2 max-w-md text-sm text-ink-2">
          Nenhuma aula gerou receita {rangeLabel.toLowerCase()}. Tenta uma
          janela maior ou abre a aba de outra arena no seletor lateral.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-clay">
              por aula
            </div>
            <div className="display-tight mt-1 text-[28px]">
              {filtered.length} aula{filtered.length === 1 ? '' : 's'}
            </div>
            <p className="mt-1.5 text-sm text-ink-2">
              Clique numa linha pra ver a lista de alunos, os pacotes que
              usaram e quanto cada um pagou pelo crédito.
            </p>
          </div>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filtrar por aula, instrutor ou arena"
              className="w-[280px] rounded-full border border-sand bg-cream px-4 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-clay"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-sm text-ink-2">
              Nada bateu com &quot;{search.trim()}&quot;.
            </div>
          </Card>
        ) : (
          filtered.map((c) => (
            <ClassRow
              key={c.slotId}
              row={c}
              open={openSlotId === c.slotId}
              onToggle={() =>
                setOpenSlotId(openSlotId === c.slotId ? null : c.slotId)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

function ClassRow({
  row,
  open,
  onToggle,
}: {
  row: AdminFinanceReport['classesByRevenue'][number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-sand bg-cream transition-colors"
      style={open ? { borderColor: 'var(--color-clay)' } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cream-2"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">
            {row.kindName ?? 'aula'} ·{' '}
            <span className="text-ink-2 font-normal">{row.instructorName}</span>
          </div>
          <div className="mt-1 text-[12px] text-ink-3">
            {formatDateTime(row.startsAt)} · {row.unitName.toLowerCase()} ·{' '}
            {row.realizedReservations}{' '}
            {row.realizedReservations === 1 ? 'aluno' : 'alunos'}
          </div>
        </div>
        <div className="text-right">
          <div className="mono display-tight text-[20px] text-clay">
            {formatCents(row.revenueCents)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-3">
            {open ? 'fechar' : 'ver detalhes →'}
          </div>
        </div>
      </button>
      {open && <ClassDetail slotId={row.slotId} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

function ClassDetail({ slotId }: { slotId: string }) {
  const q = useAdminFinanceClass(slotId);

  if (q.isLoading) {
    return (
      <div className="border-t border-sand bg-cream-2 px-5 py-5 text-sm text-ink-2">
        carregando detalhes…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="border-t border-sand bg-cream-2 px-5 py-5 text-sm text-clay-d">
        Erro ao carregar a aula.
      </div>
    );
  }

  const d = q.data;
  const { totals, reservations } = d;

  return (
    <div className="fadein border-t border-sand bg-cream-2 px-5 py-5">
      {/* Mini-KPI strip */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <MiniStat
          label="receita da aula"
          value={formatCents(totals.revenueCents)}
          accent
        />
        <MiniStat
          label="alunos que geraram"
          value={`${totals.realizedReservations} / ${d.slot.capacity}`}
        />
        <MiniStat
          label="ticket médio do seat"
          value={
            totals.realizedReservations
              ? formatCents(
                  Math.round(
                    totals.revenueCents / totals.realizedReservations,
                  ),
                )
              : '—'
          }
        />
      </div>

      {/* Source breakdown bar */}
      {totals.bySource.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
            de onde veio o crédito
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-sand/40">
            {totals.bySource.map((s) => {
              const pct = totals.revenueCents
                ? (s.revenueCents / totals.revenueCents) * 100
                : 0;
              return (
                <div
                  key={s.source}
                  style={{
                    width: `${pct}%`,
                    background: SOURCE_COLOR_CSS[s.source as CreditSource],
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {totals.bySource.map((s) => (
              <span
                key={s.source}
                className="inline-flex items-center gap-1.5 text-[11px] text-ink-2"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background: SOURCE_COLOR_CSS[s.source as CreditSource],
                  }}
                />
                {SOURCE_LABEL[s.source as CreditSource]} ·{' '}
                {formatCents(s.revenueCents)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reservations table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
            <tr className="border-b border-sand">
              <th className="py-2 pr-3 text-left">aluno</th>
              <th className="py-2 pr-3 text-left">status</th>
              <th className="py-2 pr-3 text-left">pacote</th>
              <th className="py-2 pr-3 text-right">pago no pacote</th>
              <th className="py-2 pr-3 text-right">gerou nesta aula</th>
              <th className="py-2 text-left">pagamento</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr
                key={r.id}
                className="border-b border-sand/50 last:border-b-0"
                style={!r.isRevenue ? { opacity: 0.55 } : undefined}
              >
                <td className="py-3 pr-3">
                  <div className="font-semibold text-ink">{r.userName}</div>
                  <div className="text-[11px] text-ink-3">{r.userEmail}</div>
                </td>
                <td className="py-3 pr-3">
                  <StatusChip status={r.status} />
                </td>
                <td className="py-3 pr-3">
                  <div className="font-medium text-ink">{r.packLabel}</div>
                  <div className="text-[11px] text-ink-3">
                    {r.packTotalCredits} crédito
                    {r.packTotalCredits === 1 ? '' : 's'} no pacote
                  </div>
                </td>
                <td className="py-3 pr-3 text-right mono text-ink-2">
                  {r.paidAmountCents != null
                    ? formatCents(r.paidAmountCents)
                    : '—'}
                </td>
                <td className="py-3 pr-3 text-right mono font-bold">
                  {r.isRevenue ? (
                    <span className="text-clay">
                      {formatCents(r.unitCostCents)}
                    </span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="py-3 text-[12px] text-ink-2">
                  {r.paymentMethod ? paymentMethodLabel(r.paymentMethod) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-md border border-sand bg-cream p-3"
      style={accent ? { background: 'var(--color-clay)' } : undefined}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{
          color: accent
            ? 'rgba(246,239,226,0.85)'
            : 'var(--color-ink-3)',
        }}
      >
        {label}
      </div>
      <div
        className="display-tight mt-1 text-[22px] leading-none"
        style={{ color: accent ? 'var(--color-cream)' : 'var(--color-ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

const STATUS_CHIP: Record<string, { label: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'ativa', bg: '#CFE0E0', fg: '#1f4d4d' },
  CHECKED_IN: { label: 'check-in', bg: '#E5EFE3', fg: '#2c5d39' },
  COMPLETED: { label: 'concluída', bg: '#E5EFE3', fg: '#2c5d39' },
  NO_SHOW: { label: 'no-show', bg: '#F1D6CA', fg: '#b5431f' },
  CANCELLED_BY_USER: {
    label: 'cancelada · aluno',
    bg: '#F4E8C9',
    fg: '#735517',
  },
  CANCELLED_BY_STUDIO: {
    label: 'cancelada · estúdio',
    bg: '#E0E0E0',
    fg: '#4a3f35',
  },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIP[status] ?? {
    label: status.toLowerCase(),
    bg: '#E0E0E0',
    fg: '#4a3f35',
  };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
