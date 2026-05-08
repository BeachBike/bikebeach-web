import {
  type TopInstructor,
  type WeeklyDayOccupation,
  useAdminStats,
  useAdminUnits,
} from '@/api/admin';
import { AlertItem, Card, Kpi, PageHead } from '@/components/admin/ui';

interface AdminVisionProps {
  unitId: string | undefined;
}

const DAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

export function AdminVision({ unitId }: AdminVisionProps) {
  const statsQ = useAdminStats(unitId);
  const unitsQ = useAdminUnits(true);
  const arena = unitsQ.data?.find((u) => u.id === unitId) ?? null;

  if (statsQ.isLoading) {
    return <div className="text-ink-2">Carregando...</div>;
  }

  if (statsQ.isError || !statsQ.data) {
    return <div className="text-clay-d">Erro ao carregar estatísticas.</div>;
  }

  const stats = statsQ.data;
  const offlineBikes = stats.totalBikes - stats.operationalBikes;

  const alerts: {
    tone: 'amber' | 'red' | 'sea' | 'green';
    title: string;
    detail?: string;
  }[] = [];
  if (offlineBikes > 0) {
    alerts.push({
      tone: 'amber',
      title: `${offlineBikes} bike${offlineBikes === 1 ? '' : 's'} fora de linha`,
      detail: 'Manutenção ou fora de serviço — abra a aba bikes',
    });
  }
  if (stats.todayNoShows > 0) {
    alerts.push({
      tone: 'red',
      title: `${stats.todayNoShows} no-show${stats.todayNoShows === 1 ? '' : 's'} hoje`,
      detail: 'Créditos foram consumidos automaticamente',
    });
  }
  const inactiveInstructors = stats.totalInstructors - stats.activeInstructors;
  if (inactiveInstructors > 0) {
    alerts.push({
      tone: 'sea',
      title: `${inactiveInstructors} professor${inactiveInstructors === 1 ? '' : 'es'} afastado${inactiveInstructors === 1 ? '' : 's'}`,
      detail: 'Olha a aba professores pra reativar quando voltar',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      tone: 'green',
      title: 'tudo certo na arena',
      detail: 'Nenhum alerta operacional no momento',
    });
  }

  return (
    <div className="fadein flex flex-col gap-3.5">
      <PageHead
        eyebrow={`${weekRangeLabel()} · ${arena ? arena.name.toLowerCase() : 'sem arena'}`}
        title={
          <>
            operações
            <br />
            <span className="font-normal italic text-ink-2">de relance.</span>
          </>
        }
        sub={
          arena
            ? `Tudo que rola na ${arena.name.toLowerCase()} essa semana — turmas, equipe e a frota. Pra trocar de arena, use o seletor no menu lateral.`
            : 'Selecione uma arena no menu lateral pra carregar os números.'
        }
      />

      {/* 4 KPIs (clay / cream / cream / ink) — same shape as the proto. */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          tone="clay"
          label="aulas na semana"
          value={stats.weeklyClasses}
          sub="em 7 dias"
        />
        <Kpi
          tone="cream"
          label="ocupação média"
          value={`${stats.weeklyOccupationPercent}%`}
          sub={`das bikes preenchidas`}
        />
        <Kpi
          tone="cream"
          label="instrutores ativos"
          value={stats.activeInstructors}
          sub={`de ${stats.totalInstructors} no total`}
        />
        <Kpi
          tone="ink"
          label="bikes em linha"
          value={`${stats.operationalBikes}/${stats.totalBikes || 0}`}
          sub={
            offlineBikes > 0
              ? `${offlineBikes} fora`
              : 'frota inteira ativa'
          }
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <OccupationChart days={stats.weeklyOccupation} />
        <TopInstructorsCard items={stats.topInstructors} />
      </div>

      <Card>
        <div className="text-xs font-bold uppercase tracking-wide text-clay">
          precisa de atenção
        </div>
        <div className="display-tight mt-1 text-[30px]">
          {alerts.length} {alerts.length === 1 ? 'item' : 'itens'}
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {alerts.map((a) => (
            <AlertItem
              key={a.title}
              tone={a.tone}
              title={a.title}
              detail={a.detail}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function OccupationChart({ days }: { days: WeeklyDayOccupation[] }) {
  return (
    <Card>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            ocupação
          </div>
          <div className="display-tight mt-1 text-[28px]">por dia</div>
        </div>
        <div className="text-xs text-ink-2">% das bikes preenchidas</div>
      </div>

      <div
        className="mt-6 grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(7,1fr)', height: 200 }}
      >
        {days.map((d, i) => {
          const color =
            d.occupationPercent >= 85
              ? 'var(--color-clay)'
              : d.occupationPercent >= 60
                ? 'var(--color-sun)'
                : 'var(--color-sea)';
          return (
            <div
              key={i}
              className="flex h-full flex-col items-center gap-2"
            >
              <div className="mono text-[11px] font-bold text-ink-2">
                {d.occupationPercent}%
              </div>
              <div className="flex flex-1 w-full items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-700 ease-out"
                  style={{
                    height: `${Math.max(d.occupationPercent, 4)}%`,
                    background: color,
                  }}
                />
              </div>
              <div className="text-xs font-semibold">{DAY_LABELS[i]}</div>
              <div className="text-[10px] text-ink-2">
                {d.classCount} {d.classCount === 1 ? 'aula' : 'aulas'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TopInstructorsCard({ items }: { items: TopInstructor[] }) {
  return (
    <Card>
      <div className="text-xs font-bold uppercase tracking-wide text-clay">
        top da semana
      </div>
      <div className="display-tight mt-1 text-[28px]">instrutores</div>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xs border border-dashed border-sand-2 bg-cream-2 px-3 py-5 text-center text-xs text-ink-2">
          Sem aulas marcadas ainda nessa semana.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {items.map((p, i) => (
            <div
              key={p.id}
              className="grid items-center gap-3"
              style={{ gridTemplateColumns: '24px 36px 1fr auto' }}
            >
              <span className="display-tight text-[18px] text-ink-2">
                {i + 1}
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-sea text-[12px] font-bold text-cream">
                {initialsOf(p.name)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold lowercase">
                  {p.name}
                </div>
                {p.primaryClassKindName && (
                  <div className="truncate text-xs text-ink-2 lowercase">
                    {p.primaryClassKindName}
                  </div>
                )}
              </div>
              <div className="mono text-sm font-bold text-clay">
                {p.classesThisWeek} aula{p.classesThisWeek === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  );
}

function weekRangeLabel(): string {
  const start = new Date();
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `semana de ${fmt(start)} a ${fmt(end)}`;
}
