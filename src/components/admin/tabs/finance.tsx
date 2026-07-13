import { useMemo, useState } from 'react';
import {
  type AdminFinanceReport,
  type CreditSource,
  type PaymentMethodCode,
  useAdminFinance,
  useAdminUnits,
} from '@/api/admin';
import { Card, Kpi, PageHead } from '@/components/admin/ui';
import {
  METHOD_COLOR_CSS,
  SOURCE_COLOR_CSS,
  SOURCE_LABEL,
} from '@/components/admin/finance/shared';
import { PerClassView } from '@/components/admin/finance/per-class';
import { formatCents, paymentMethodLabel } from '@/lib/format';

/// "Financeiro" tab — informational dashboard. Two sub-views:
/// — Resumo: KPIs, gráficos e tops do período.
/// — Por aula: explorador de aula em aula, com alunos e pacotes.
///
/// Toolbar carries (1) o escopo de arena (esta arena / todas), (2) o
/// período (presets + range customizado), e (3) exportar PDF (vetorial,
/// não screenshot).

interface AdminFinanceProps {
  /// Arena currently selected in the sidebar. The finance tab honors this
  /// by default but can override to "todas" via the scope toggle.
  unitId: string | undefined;
}

type RangePreset = 'this_month' | 'last_month' | 'last_30' | 'last_7' | 'custom';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'this_month', label: 'este mês' },
  { id: 'last_month', label: 'mês passado' },
  { id: 'last_30', label: '30 dias' },
  { id: 'last_7', label: '7 dias' },
  { id: 'custom', label: 'personalizado' },
];

type SubTab = 'resumo' | 'per-class';

export function AdminFinance({ unitId }: AdminFinanceProps) {
  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [customFrom, setCustomFrom] = useState<string>(defaultCustomFromIso());
  const [customTo, setCustomTo] = useState<string>(defaultCustomToIso());
  // The admin's preferred scope. When no arena is selected we coerce the
  // effective scope to "all" via the derived value below — the stored
  // preference stays put so flipping back to a single arena restores it.
  const [scopePreference, setScopePreference] = useState<'arena' | 'all'>(
    'arena',
  );
  const scope: 'arena' | 'all' = unitId ? scopePreference : 'all';
  const [subTab, setSubTab] = useState<SubTab>('resumo');
  const [exporting, setExporting] = useState(false);

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const unitsQ = useAdminUnits(true);
  const arena = unitsQ.data?.find((u) => u.id === unitId) ?? null;

  // Effective unitId sent to the API: undefined means "all arenas".
  const effectiveUnitId = scope === 'all' ? undefined : unitId;

  const reportQ = useAdminFinance({
    from: range.fromIso,
    to: range.toIso,
    unitId: effectiveUnitId,
  });

  const scopeLabel =
    scope === 'all'
      ? 'todas as arenas'
      : arena
        ? arena.name.toLowerCase()
        : 'arena';

  async function onExportPdf() {
    if (!reportQ.data) return;
    setExporting(true);
    try {
      // Lazy-load the PDF generator: react-pdf is ~300 KB gzipped and the
      // admin only pays for it when they actually click "exportar PDF".
      const { downloadFinanceReportPdf } = await import(
        '@/components/admin/finance/pdf-report'
      );
      await downloadFinanceReportPdf(reportQ.data, range.label, scopeLabel);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fadein flex flex-col gap-3.5">
      <PageHead
        eyebrow={`${range.label} · ${scopeLabel}`}
        title={
          <>
            financeiro
            <br />
            <span className="font-normal italic text-ink-2">em números.</span>
          </>
        }
        sub="Receita atribuída por crédito consumido. Vendas de pacotes ficam globais — PackOffers não são por arena."
        actions={
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!reportQ.data || exporting}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PdfIcon />
            {exporting ? 'gerando…' : 'exportar PDF'}
          </button>
        }
      />

      <Toolbar
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        scope={scope}
        onScopeChange={setScopePreference}
        hasArena={!!unitId}
        arenaName={arena?.name.toLowerCase() ?? null}
      />

      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 self-start rounded-full bg-cream-2 p-1">
        {(
          [
            { id: 'resumo' as SubTab, label: 'resumo' },
            { id: 'per-class' as SubTab, label: 'por aula' },
          ]
        ).map((t) => {
          const on = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                on ? 'bg-clay text-cream' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {reportQ.isLoading ? (
        <div className="text-ink-2">Carregando…</div>
      ) : reportQ.isError || !reportQ.data ? (
        <div className="text-clay-d">Erro ao carregar o financeiro.</div>
      ) : subTab === 'resumo' ? (
        <ResumoView report={reportQ.data} />
      ) : (
        <PerClassView
          classes={reportQ.data.classesByRevenue}
          rangeLabel={range.label}
        />
      )}
    </div>
  );
}

/* ─── Toolbar ─────────────────────────────────────────────── */

function Toolbar({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  scope,
  onScopeChange,
  hasArena,
  arenaName,
}: {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (s: string) => void;
  onCustomToChange: (s: string) => void;
  scope: 'arena' | 'all';
  onScopeChange: (s: 'arena' | 'all') => void;
  hasArena: boolean;
  arenaName: string | null;
}) {
  return (
    <Card className="flex flex-wrap items-center gap-4">
      {/* Scope */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
          escopo
        </span>
        <div className="inline-flex gap-1 rounded-full bg-cream-2 p-1">
          <ToolbarPill
            on={scope === 'arena'}
            disabled={!hasArena}
            onClick={() => onScopeChange('arena')}
            title={!hasArena ? 'Selecione uma arena no sidebar' : undefined}
          >
            {arenaName ?? 'arena atual'}
          </ToolbarPill>
          <ToolbarPill
            on={scope === 'all'}
            onClick={() => onScopeChange('all')}
          >
            todas as arenas
          </ToolbarPill>
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
          período
        </span>
        <div className="inline-flex gap-1 rounded-full bg-cream-2 p-1">
          {PRESETS.map((p) => (
            <ToolbarPill
              key={p.id}
              on={preset === p.id}
              onClick={() => onPresetChange(p.id)}
            >
              {p.label}
            </ToolbarPill>
          ))}
        </div>
      </div>

      {/* Custom range inputs — only when "personalizado" active */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 text-[13px]">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            max={customTo}
            className="rounded-md border border-sand bg-cream px-3 py-1.5 outline-none focus:border-clay"
          />
          <span className="text-ink-3">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            min={customFrom}
            className="rounded-md border border-sand bg-cream px-3 py-1.5 outline-none focus:border-clay"
          />
        </div>
      )}
    </Card>
  );
}

function ToolbarPill({
  on,
  onClick,
  children,
  disabled,
  title,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'bg-ink text-cream' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function PdfIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

/* ─── Resumo view (was the whole tab before) ─────────────── */

function ResumoView({ report }: { report: AdminFinanceReport }) {
  const { kpis } = report;
  const topClasses = report.classesByRevenue.slice(0, 10);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          tone="clay"
          label="receita total"
          value={formatCents(kpis.totalRevenueCents)}
          sub={`${kpis.realizedReservations} crédito${kpis.realizedReservations === 1 ? '' : 's'} consumido${kpis.realizedReservations === 1 ? '' : 's'}`}
        />
        <Kpi
          tone="cream"
          label="aulas que geraram"
          value={kpis.classesWithRevenue}
          sub="contam aulas com ao menos 1 crédito consumido"
        />
        <Kpi
          tone="cream"
          label="ticket médio por aula"
          value={formatCents(kpis.avgRevenuePerClassCents)}
          sub="receita ÷ aulas que geraram"
        />
        <Kpi
          tone="ink"
          label="pacote campeão"
          value={kpis.bestSellingPack ? kpis.bestSellingPack.label : '—'}
          sub={
            kpis.bestSellingPack
              ? `${kpis.bestSellingPack.soldCount} vendido${kpis.bestSellingPack.soldCount === 1 ? '' : 's'} · ${formatCents(kpis.bestSellingPack.revenueCents)}`
              : 'sem vendas no período'
          }
        />
      </div>

      {/* Cortesias / presentes — grátis por definição, então ficam FORA da
          receita. Mostrado à parte pro admin acompanhar quanto foi dado em
          sorteios/parcerias no período. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xs border border-sand bg-cream-2 px-4 py-3 text-[13px]">
        <span className="rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
          grátis
        </span>
        <span className="text-ink-2">
          <b className="text-ink">cortesias</b> no período:{' '}
          <b className="text-ink">{report.gifts.packCount}</b> presente
          {report.gifts.packCount === 1 ? '' : 's'} ·{' '}
          <b className="text-ink">{report.gifts.creditCount}</b> crédito
          {report.gifts.creditCount === 1 ? '' : 's'} dado
          {report.gifts.creditCount === 1 ? '' : 's'} de graça — não contam como
          receita.
        </span>
      </div>

      <DailyRevenueChart days={report.dailyRevenue} />

      <div className="grid gap-3.5 lg:grid-cols-2">
        <BreakdownCard
          title="por origem"
          subtitle="de onde veio o crédito que rodou na bike"
          empty="sem receita realizada"
          items={report.revenueBySource.map((s) => ({
            key: s.source,
            label: SOURCE_LABEL[s.source as CreditSource],
            valueCents: s.revenueCents,
            color: SOURCE_COLOR_CSS[s.source as CreditSource],
          }))}
          total={kpis.totalRevenueCents}
        />
        <BreakdownCard
          title="por meio de pagamento"
          subtitle="como o cliente pagou (cobranças confirmadas)"
          empty="sem cobranças confirmadas"
          items={report.revenueByMethod.map((m) => ({
            key: m.method,
            label: `${paymentMethodLabel(m.method)} · ${m.count} cobrança${m.count === 1 ? '' : 's'}`,
            valueCents: m.revenueCents,
            color: METHOD_COLOR_CSS[m.method as PaymentMethodCode],
          }))}
          total={report.revenueByMethod.reduce(
            (a, b) => a + b.revenueCents,
            0,
          )}
        />
      </div>

      <TopPacksCard packs={report.topPacks} />
      <TopClassesCard classes={topClasses} />
      <AttributionExplainer />
    </div>
  );
}

/* ─── Resumo sub-components ──────────────────────────────── */

function DailyRevenueChart({
  days,
}: {
  days: AdminFinanceReport['dailyRevenue'];
}) {
  if (days.length === 0) {
    return (
      <Card>
        <div className="text-xs font-bold uppercase tracking-wide text-clay">
          receita por dia
        </div>
        <div className="display-tight mt-1 text-[28px]">sem movimento</div>
        <p className="mt-2 text-sm text-ink-2">
          Nenhuma aula gerou receita no período. Confira as datas no seletor.
        </p>
      </Card>
    );
  }

  const max = Math.max(...days.map((d) => d.revenueCents), 1);
  const total = days.reduce((a, b) => a + b.revenueCents, 0);

  return (
    <Card>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            receita por dia
          </div>
          <div className="display-tight mt-1 text-[28px]">
            {formatCents(total)}
          </div>
        </div>
        <div className="text-right text-xs text-ink-2">
          {days.length} {days.length === 1 ? 'dia' : 'dias'} com receita
        </div>
      </div>

      <div
        className="mt-6 flex items-end gap-[6px] overflow-x-auto pb-1"
        style={{ height: 160 }}
      >
        {days.map((d) => {
          const pct = Math.max(2, Math.round((d.revenueCents / max) * 100));
          const color =
            d.revenueCents >= max * 0.66
              ? 'var(--color-clay)'
              : d.revenueCents >= max * 0.33
                ? 'var(--color-sun)'
                : 'var(--color-sea)';
          return (
            <div
              key={d.date}
              className="group flex h-full flex-1 min-w-[14px] flex-col items-center justify-end"
              title={`${formatDayShort(d.date)} · ${formatCents(d.revenueCents)}`}
            >
              <div
                className="w-full rounded-t-md transition-all duration-500 ease-out"
                style={{
                  height: `${pct}%`,
                  background: color,
                  opacity: 0.92,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>{formatDayShort(days[0]!.date)}</span>
        <span>{formatDayShort(days[days.length - 1]!.date)}</span>
      </div>
    </Card>
  );
}

interface BreakdownItem {
  key: string;
  label: string;
  valueCents: number;
  color: string;
}

function BreakdownCard({
  title,
  subtitle,
  items,
  total,
  empty,
}: {
  title: string;
  subtitle: string;
  items: BreakdownItem[];
  total: number;
  empty: string;
}) {
  return (
    <Card>
      <div className="text-xs font-bold uppercase tracking-wide text-clay">
        {title}
      </div>
      <div className="mt-0.5 text-[13px] text-ink-2">{subtitle}</div>
      <div className="display-tight mt-3 text-[28px]">
        {total ? formatCents(total) : '—'}
      </div>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xs border border-dashed border-sand-2 bg-cream-2 px-3 py-5 text-center text-xs text-ink-2">
          {empty}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {items.map((it) => {
            const pct = total ? Math.round((it.valueCents / total) * 100) : 0;
            return (
              <div key={it.key}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-semibold text-ink">{it.label}</span>
                  <span className="mono font-semibold text-ink">
                    {formatCents(it.valueCents)}{' '}
                    <span className="text-ink-3">· {pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-2">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background: it.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TopPacksCard({ packs }: { packs: AdminFinanceReport['topPacks'] }) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            pacotes mais vendidos
          </div>
          <div className="display-tight mt-1 text-[28px]">no período</div>
        </div>
        <div className="text-xs text-ink-2">
          vendas globais (PackOffers não são por arena)
        </div>
      </div>

      {packs.length === 0 ? (
        <div className="mt-4 rounded-xs border border-dashed border-sand-2 bg-cream-2 px-3 py-5 text-center text-xs text-ink-2">
          Nenhum pacote vendido no período.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
              <tr className="border-b border-sand">
                <th className="py-2 pr-4 text-left">pacote</th>
                <th className="py-2 pr-4 text-right">vendidos</th>
                <th className="py-2 pr-4 text-right">receita</th>
                <th className="py-2 text-right">por aula</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p.classes} className="border-b border-sand/50">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-ink">{p.label}</div>
                    <div className="text-[11px] text-ink-3">
                      {p.classes} crédito{p.classes === 1 ? '' : 's'} por venda
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="mono text-base font-bold text-clay">
                      {p.soldCount}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right mono">
                    {formatCents(p.revenueCents)}
                  </td>
                  <td className="py-3 text-right mono text-ink-2">
                    {formatCents(p.avgPricePerClassCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TopClassesCard({
  classes,
}: {
  classes: AdminFinanceReport['classesByRevenue'];
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            aulas que mais geraram
          </div>
          <div className="display-tight mt-1 text-[28px]">top 10</div>
        </div>
        <div className="text-xs text-ink-2">
          abre a aba <strong>por aula</strong> pra ver os alunos
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="mt-4 rounded-xs border border-dashed border-sand-2 bg-cream-2 px-3 py-5 text-center text-xs text-ink-2">
          Sem aulas com receita no período.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {classes.map((c, i) => (
            <div
              key={c.slotId}
              className="grid items-center gap-3 rounded-sm bg-cream-2 px-4 py-3"
              style={{ gridTemplateColumns: '28px 1fr auto' }}
            >
              <span className="display-tight text-[20px] text-ink-2">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {c.kindName ?? 'aula'} · {firstWord(c.instructorName)}
                </div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  {formatDateTime(c.startsAt)} · {c.realizedReservations}{' '}
                  {c.realizedReservations === 1 ? 'pessoa' : 'pessoas'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(
                    Object.entries(c.sourceBreakdown) as [CreditSource, number][]
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, cents]) => (
                      <span
                        key={source}
                        className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-ink-2"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: SOURCE_COLOR_CSS[source] }}
                        />
                        {SOURCE_LABEL[source]}: {formatCents(cents)}
                      </span>
                    ))}
                </div>
              </div>
              <div className="text-right">
                <div className="mono display-tight text-[22px] text-clay">
                  {formatCents(c.revenueCents)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AttributionExplainer() {
  return (
    <Card className="bg-cream-2">
      <div className="text-xs font-bold uppercase tracking-wide text-clay">
        como a gente conta
      </div>
      <div className="mt-3 grid gap-4 text-[13.5px] leading-relaxed text-ink-2 sm:grid-cols-2">
        <div>
          <div className="display-tight text-[18px] text-ink">
            receita por aula
          </div>
          <p className="mt-1.5">
            cada crédito consumido vale{' '}
            <strong className="text-ink">preço pago ÷ créditos do pacote</strong>
            . Uma avulsa de R$ 45 entra como R$ 45. Um pacote de 10 a R$ 300
            entra como R$ 30 por crédito. As duas na mesma aula = R$ 75.
          </p>
        </div>
        <div>
          <div className="display-tight text-[18px] text-ink">
            quando o crédito conta como receita
          </div>
          <p className="mt-1.5">
            checked-in, completou, no-show e <em>cancelamento dentro das 8h</em>{' '}
            contam (o crédito foi consumido). Cancelamento antes das 8h e
            cancelamento pelo estúdio devolvem o crédito — não geram receita.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ─── Range / date helpers ───────────────────────────────── */

interface ResolvedRange {
  fromIso: string;
  toIso: string;
  label: string;
}

function resolveRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): ResolvedRange {
  const now = new Date();
  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { fromIso: from.toISOString(), toIso: to.toISOString(), label: 'este mês' };
  }
  if (preset === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromIso: from.toISOString(), toIso: to.toISOString(), label: 'mês passado' };
  }
  if (preset === 'last_30') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return {
      fromIso: from.toISOString(),
      toIso: now.toISOString(),
      label: 'últimos 30 dias',
    };
  }
  if (preset === 'last_7') {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return {
      fromIso: from.toISOString(),
      toIso: now.toISOString(),
      label: 'últimos 7 dias',
    };
  }
  // custom — interpret the date inputs as LOCAL midnight; `to` is the END
  // of the chosen day so the picked end-date is inclusive.
  const fromDate = parseLocalDate(customFrom) ?? new Date(now);
  const toRaw = parseLocalDate(customTo) ?? new Date(now);
  const toDate = new Date(toRaw);
  toDate.setDate(toDate.getDate() + 1);
  return {
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    label: `${formatBrazilianDate(fromDate)} → ${formatBrazilianDate(toRaw)}`,
  };
}

function parseLocalDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function defaultCustomFromIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return toInputDate(d);
}

function defaultCustomToIso(): string {
  return toInputDate(new Date());
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatBrazilianDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function firstWord(s: string): string {
  return s.toLowerCase().split(' ')[0] ?? s;
}
