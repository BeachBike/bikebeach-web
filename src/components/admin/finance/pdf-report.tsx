/* eslint-disable react-refresh/only-export-components --
 * This module pairs the PDF Document component with the trigger function
 * (`downloadFinanceReportPdf`) that calls `pdf(...).toBlob()`. They belong
 * together; HMR isn't relevant to a one-shot blob generator. */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import type { AdminFinanceReport, CreditSource } from '@/api/admin';
import { paymentMethodLabel } from '@/lib/format';
import {
  BRAND_HEX,
  METHOD_COLOR_HEX,
  SOURCE_COLOR_HEX,
  SOURCE_LABEL,
} from './shared';

/// PDF generator for the financeiro tab. Builds a real vector PDF (no
/// screenshot) using `@react-pdf/renderer` — text is selectable, the file
/// is printable at any DPI, and the bikebeach brand colors are baked in.
///
/// The font stays as the built-in Helvetica so we don't pay an HTTP round
/// trip for TTFs at export time. Letterhead, palette and section structure
/// match the on-screen tab so admins recognize the document immediately.

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: BRAND_HEX.ink,
    backgroundColor: BRAND_HEX.cream,
  },
  // ── Header ────────────────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_HEX.sand,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center' },
  brandDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND_HEX.clay,
    marginRight: 8,
  },
  brandName: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  brandTag: {
    fontSize: 8,
    color: BRAND_HEX.ink3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginTop: 18,
    color: BRAND_HEX.ink,
  },
  subtitle: { fontSize: 10, color: BRAND_HEX.ink2, marginTop: 4 },
  // ── KPIs ──────────────────────────────────────────────────────────
  kpiRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  kpiBox: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: BRAND_HEX.cream2,
  },
  kpiBoxAccent: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: BRAND_HEX.clay,
  },
  kpiLabel: {
    fontSize: 7,
    color: BRAND_HEX.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  kpiLabelAccent: {
    fontSize: 7,
    color: BRAND_HEX.cream,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    color: BRAND_HEX.ink,
  },
  kpiValueAccent: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    color: BRAND_HEX.cream,
  },
  kpiSub: { fontSize: 8, color: BRAND_HEX.ink2, marginTop: 3 },
  kpiSubAccent: { fontSize: 8, color: BRAND_HEX.cream, marginTop: 3 },
  // ── Section ───────────────────────────────────────────────────────
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_HEX.clay,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  // ── Breakdown bars ────────────────────────────────────────────────
  breakdownRow: { marginBottom: 6 },
  breakdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  breakdownLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  breakdownValue: { fontSize: 9, color: BRAND_HEX.ink2 },
  breakdownBarBg: {
    height: 5,
    backgroundColor: BRAND_HEX.cream2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: { height: 5, borderRadius: 3 },
  // ── Tables ────────────────────────────────────────────────────────
  table: { marginTop: 4 },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_HEX.sand,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND_HEX.sand,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_HEX.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  td: { fontSize: 9, color: BRAND_HEX.ink },
  tdRight: { fontSize: 9, color: BRAND_HEX.ink, textAlign: 'right' },
  tdSub: { fontSize: 7, color: BRAND_HEX.ink3, marginTop: 1 },
  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: BRAND_HEX.ink3,
  },
});

interface ReportProps {
  report: AdminFinanceReport;
  rangeLabel: string;
  scopeLabel: string;
  generatedAt: Date;
}

function FinanceReportDoc({
  report,
  rangeLabel,
  scopeLabel,
  generatedAt,
}: ReportProps) {
  const { kpis } = report;
  const methodTotal = report.revenueByMethod.reduce(
    (a, b) => a + b.revenueCents,
    0,
  );
  const topClasses = report.classesByRevenue.slice(0, 12);
  const generatedLabel = generatedAt.toLocaleString('pt-BR');

  return (
    <Document
      title={`bikebeach · financeiro · ${rangeLabel}`}
      author="bikebeach"
      subject="Relatório financeiro"
    >
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.brandDot} />
            <Text style={styles.brandName}>bikebeach</Text>
          </View>
          <Text style={styles.brandTag}>relatório financeiro</Text>
        </View>

        <Text style={styles.title}>Financeiro · {rangeLabel}</Text>
        <Text style={styles.subtitle}>
          {scopeLabel} · receita atribuída por crédito consumido · valores em
          BRL
        </Text>

        {/* KPI grid */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBoxAccent}>
            <Text style={styles.kpiLabelAccent}>receita total</Text>
            <Text style={styles.kpiValueAccent}>
              {formatBRL(kpis.totalRevenueCents)}
            </Text>
            <Text style={styles.kpiSubAccent}>
              {kpis.realizedReservations} créditos consumidos
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>aulas que geraram</Text>
            <Text style={styles.kpiValue}>{kpis.classesWithRevenue}</Text>
            <Text style={styles.kpiSub}>com ao menos 1 crédito</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ticket médio</Text>
            <Text style={styles.kpiValue}>
              {formatBRL(kpis.avgRevenuePerClassCents)}
            </Text>
            <Text style={styles.kpiSub}>por aula</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>pacote campeão</Text>
            <Text style={styles.kpiValue}>
              {kpis.bestSellingPack?.label ?? '—'}
            </Text>
            <Text style={styles.kpiSub}>
              {kpis.bestSellingPack
                ? `${kpis.bestSellingPack.soldCount} vendidos · ${formatBRL(kpis.bestSellingPack.revenueCents)}`
                : 'sem vendas'}
            </Text>
          </View>
        </View>

        {/* Source breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>receita por origem</Text>
          {report.revenueBySource.length === 0 ? (
            <Text style={styles.subtitle}>sem receita realizada.</Text>
          ) : (
            report.revenueBySource.map((s) => {
              const pct = kpis.totalRevenueCents
                ? Math.round((s.revenueCents / kpis.totalRevenueCents) * 100)
                : 0;
              return (
                <View key={s.source} style={styles.breakdownRow}>
                  <View style={styles.breakdownTop}>
                    <Text style={styles.breakdownLabel}>
                      {SOURCE_LABEL[s.source as CreditSource]}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatBRL(s.revenueCents)} · {pct}%
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View
                      style={{
                        ...styles.breakdownBarFill,
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor:
                          SOURCE_COLOR_HEX[s.source as CreditSource],
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Method breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>receita por meio de pagamento</Text>
          {report.revenueByMethod.length === 0 ? (
            <Text style={styles.subtitle}>
              sem cobranças confirmadas no período.
            </Text>
          ) : (
            report.revenueByMethod.map((m) => {
              const pct = methodTotal
                ? Math.round((m.revenueCents / methodTotal) * 100)
                : 0;
              return (
                <View key={m.method} style={styles.breakdownRow}>
                  <View style={styles.breakdownTop}>
                    <Text style={styles.breakdownLabel}>
                      {paymentMethodLabel(m.method)} · {m.count} cobrança
                      {m.count === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatBRL(m.revenueCents)} · {pct}%
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View
                      style={{
                        ...styles.breakdownBarFill,
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: METHOD_COLOR_HEX[m.method],
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Top packs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>pacotes mais vendidos</Text>
          {report.topPacks.length === 0 ? (
            <Text style={styles.subtitle}>
              nenhum pacote vendido no período.
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={{ ...styles.th, flex: 2 }}>pacote</Text>
                <Text style={{ ...styles.th, flex: 1, textAlign: 'right' }}>
                  vendidos
                </Text>
                <Text style={{ ...styles.th, flex: 1.5, textAlign: 'right' }}>
                  receita
                </Text>
                <Text style={{ ...styles.th, flex: 1.2, textAlign: 'right' }}>
                  por aula
                </Text>
              </View>
              {report.topPacks.map((p) => (
                <View key={p.classes} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.td}>{p.label}</Text>
                    <Text style={styles.tdSub}>
                      {p.classes} crédito{p.classes === 1 ? '' : 's'} por venda
                    </Text>
                  </View>
                  <Text style={{ ...styles.tdRight, flex: 1 }}>
                    {p.soldCount}
                  </Text>
                  <Text style={{ ...styles.tdRight, flex: 1.5 }}>
                    {formatBRL(p.revenueCents)}
                  </Text>
                  <Text style={{ ...styles.tdRight, flex: 1.2 }}>
                    {formatBRL(p.avgPricePerClassCents)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Top classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>aulas que mais geraram</Text>
          {topClasses.length === 0 ? (
            <Text style={styles.subtitle}>
              sem aulas com receita no período.
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={{ ...styles.th, flex: 0.5 }}>#</Text>
                <Text style={{ ...styles.th, flex: 1.5 }}>data</Text>
                <Text style={{ ...styles.th, flex: 2.5 }}>aula</Text>
                <Text style={{ ...styles.th, flex: 1, textAlign: 'right' }}>
                  alunos
                </Text>
                <Text style={{ ...styles.th, flex: 1.4, textAlign: 'right' }}>
                  receita
                </Text>
              </View>
              {topClasses.map((c, i) => (
                <View key={c.slotId} style={styles.tableRow}>
                  <Text style={{ ...styles.td, flex: 0.5 }}>{i + 1}</Text>
                  <Text style={{ ...styles.td, flex: 1.5 }}>
                    {formatShortDateTime(c.startsAt)}
                  </Text>
                  <View style={{ flex: 2.5 }}>
                    <Text style={styles.td}>
                      {c.kindName ?? 'aula'} · {c.instructorName}
                    </Text>
                    <Text style={styles.tdSub}>{c.unitName}</Text>
                  </View>
                  <Text style={{ ...styles.tdRight, flex: 1 }}>
                    {c.realizedReservations}
                  </Text>
                  <Text style={{ ...styles.tdRight, flex: 1.4 }}>
                    {formatBRL(c.revenueCents)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>gerado em {generatedLabel}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `pág. ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/// Build the PDF and trigger a download. Caller controls when (button).
export async function downloadFinanceReportPdf(
  report: AdminFinanceReport,
  rangeLabel: string,
  scopeLabel: string,
): Promise<void> {
  const blob = await pdf(
    <FinanceReportDoc
      report={report}
      rangeLabel={rangeLabel}
      scopeLabel={scopeLabel}
      generatedAt={new Date()}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bikebeach-financeiro-${slugify(rangeLabel)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke until the browser has consumed the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── local formatters (must NOT use CSS-dependent helpers) ──────── */

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
