import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AdminClassSlot,
  useAdminClassSlots,
} from '@/api/admin';
import type { Me } from '@/api/me';
import { useConfirmStart } from '@/api/professor';
import { firstName, formatCountdownSmart } from '@/lib/format';
import { useArenaStore } from '@/stores/arena';

interface DashboardTabProps {
  me: Me;
  onChangeTab: (id: 'dashboard' | 'agenda' | 'alunos') => void;
  onOpenLiveCancel: (slot: AdminClassSlot) => void;
  onOpenCancel: (slot: AdminClassSlot) => void;
  onOpenCreateClass: () => void;
  onOpenCheckIn: (slot: AdminClassSlot) => void;
}

export function DashboardTab({
  me,
  onChangeTab,
  onOpenLiveCancel,
  onOpenCancel,
  onOpenCreateClass,
  onOpenCheckIn,
}: DashboardTabProps) {
  const range = monthRange();
  // Use the global arena store so the multi-arena instructor can switch
  // arenas via the picker in the top bar. ArenaGuard ensures the store
  // sits on a valid id from `me.arenas` for INSTRUCTOR.
  const selectedArena = useArenaStore((s) => s.selectedArenaId);
  const slotsQ = useAdminClassSlots(
    selectedArena === 'all' ? me.unitId ?? undefined : selectedArena,
    range.from,
    range.to,
  );

  // 30s tick so a slot that crosses startsAt flips from "próxima aula"
  // to "ao vivo · sua aula" without a manual refresh. Combined with
  // `refetchInterval` on `useAdminClassSlots`, the page also sees status
  // changes pushed by the auto-confirm / markCompleted cron jobs.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const allMine = useMemo(() => {
    return (slotsQ.data ?? []).filter((s) => s.instructorId === me.id);
  }, [slotsQ.data, me.id]);

  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const live = useMemo(
    () => allMine.find((s) => isLive(s, now)),
    [allMine, now],
  );
  const proxima = useMemo(
    () =>
      allMine
        .filter(
          (s) => s.status === 'SCHEDULED' && new Date(s.startsAt) > now,
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        )[0],
    [allMine, now],
  );

  const semana = allMine.filter((s) => {
    const d = new Date(s.startsAt);
    return Math.abs(d.getTime() - now.getTime()) < 7 * 86400000;
  }).length;
  const concluidas = allMine.filter((s) => s.status === 'COMPLETED').length;
  const alunosFoco = live?.reservedCount ?? proxima?.reservedCount ?? 0;

  const greetWord = greetingFor(now);
  const meFirstName = firstName(me.name) || 'professor';

  return (
    <div className="fadein">
      <section className="pb-2 pt-7">
        <div className="text-sm font-semibold text-clay">{greetWord},</div>
        <div
          className="display-tight mt-1.5 leading-[.92]"
          style={{ fontSize: 'clamp(48px, 8vw, 92px)' }}
        >
          {meFirstName}.
          <br />
          {live ? (
            <span className="font-normal italic text-ink-2">
              aula rolando agora.
            </span>
          ) : (
            <span className="font-normal italic text-ink-2">
              tudo certo pra hoje.
            </span>
          )}
        </div>
      </section>

      {live && (
        <LiveClassCard
          slot={live}
          onCancel={() => onOpenLiveCancel(live)}
          onOpenCheckIn={() => onOpenCheckIn(live)}
        />
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi tone="cream" label="essa semana" value={semana} sub="aulas marcadas" />
        <Kpi tone="cream" label="concluídas" value={concluidas} sub="histórico recente" />
        <Kpi
          tone="clay"
          label={live ? 'alunos agora' : 'alunos na próxima'}
          value={alunosFoco}
          sub={live ? 'na arena' : proxima ? `${proxima.capacity} vagas` : 'sem aula marcada'}
        />
      </div>

      {!live && proxima && (
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,360px)]">
          <NextClassCard
            slot={proxima}
            onOpenLive={() => onOpenCheckIn(proxima)}
          />
          <div className="flex flex-col gap-3 rounded-[22px] bg-cream-2 p-6">
            <div className="text-xs font-bold uppercase tracking-wide text-clay">
              atalhos
            </div>
            <ShortcutButton
              title="nova aula"
              hint="marque um horário extra na grade"
              icon={<PlusIcon />}
              onClick={onOpenCreateClass}
            />
            <ShortcutButton
              title="ver alunos"
              hint="quem vem na próxima aula"
              icon={<ChevRightIcon />}
              onClick={() => onChangeTab('alunos')}
            />
          </div>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3.5 flex items-end justify-between">
          <div className="display-tight text-[28px]">próximas aulas</div>
          <button
            type="button"
            onClick={() => onChangeTab('agenda')}
            className="text-sm font-semibold text-clay"
          >
            ver tudo →
          </button>
        </div>
        <SlotList
          items={allMine
            .filter((s) => s.status === 'SCHEDULED' && new Date(s.startsAt) > now)
            .sort(
              (a, b) =>
                new Date(a.startsAt).getTime() -
                new Date(b.startsAt).getTime(),
            )
            .slice(0, 4)}
          onCancel={onOpenCancel}
        />
      </section>
    </div>
  );
}

function Kpi({
  tone = 'cream',
  label,
  value,
  sub,
}: {
  tone?: 'cream' | 'clay' | 'ink';
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  const cls =
    tone === 'clay'
      ? 'bg-clay text-cream'
      : tone === 'ink'
        ? 'bg-ink text-cream'
        : 'bg-cream-2 text-ink';
  return (
    <div
      className={`flex min-h-[140px] flex-col justify-between rounded-[18px] px-6 py-5 ${cls}`}
    >
      <span className="text-xs font-bold uppercase tracking-wide opacity-85">
        {label}
      </span>
      <div>
        <div className="display-tight mt-1 text-[54px] leading-none">
          {value}
        </div>
        <div className="mt-1 text-[13px] font-medium opacity-85">{sub}</div>
      </div>
    </div>
  );
}

function LiveClassCard({
  slot,
  onCancel,
  onOpenCheckIn,
}: {
  slot: AdminClassSlot;
  onCancel: () => void;
  onOpenCheckIn: () => void;
}) {
  const fim = new Date(
    new Date(slot.startsAt).getTime() + slot.durationMinutes * 60_000,
  );
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const total = slot.durationMinutes * 60_000;
  const restante = Math.max(0, fim.getTime() - now.getTime());
  const decorrido = total - restante;
  const pct = Math.min(100, Math.max(0, (decorrido / total) * 100));
  const min = String(Math.floor(restante / 60000)).padStart(2, '0');
  const sec = String(Math.floor((restante % 60000) / 1000)).padStart(2, '0');
  const confirmMut = useConfirmStart();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const startedConfirmed = !!slot.confirmedStartedAt;

  const onTapConfirm = async () => {
    setConfirmError(null);
    try {
      await confirmMut.mutateAsync(slot.id);
    } catch (err) {
      const r = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const m = r?.response?.data?.message;
      setConfirmError(
        Array.isArray(m) ? m.join('. ') : m ?? 'Não conseguimos confirmar.',
      );
    }
  };

  return (
    <div
      className="relative mt-6 overflow-hidden rounded-[22px] border-2 border-clay bg-ink px-7 py-6 text-cream"
      style={{ animation: 'slidein .35s cubic-bezier(.2,.7,.2,1) both' }}
    >
      <div
        className="absolute -right-24 -top-24 size-[340px] rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--color-clay), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[.06em] text-clay">
              <span className="bb-livepulse size-2 rounded-full bg-clay" />
              ao vivo · sua aula
            </div>
            <div
              className="display-tight mt-2 leading-[.95]"
              style={{ fontSize: 'clamp(36px,5vw,60px)' }}
            >
              {slot.classKind?.name ?? slot.title ?? 'aula em andamento'}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-sm text-cream/70">
              <span>{slot.reservedCount} alunos na arena</span>
              {startedConfirmed && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: slot.autoStartConfirmed
                      ? 'rgba(248,201,136,.25)'
                      : 'rgba(63,122,79,.35)',
                    color: slot.autoStartConfirmed
                      ? 'var(--color-sun)'
                      : '#9bd1a8',
                  }}
                >
                  {slot.autoStartConfirmed
                    ? 'auto-confirmada'
                    : 'início confirmado'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-cream/60">
              termina em
            </span>
            <span className="display-tight mono text-[54px] leading-none text-sun">
              {min}:{sec}
            </span>
          </div>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-cream/15">
          <div
            className="h-full rounded-full bg-sun transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!startedConfirmed && (
            <button
              type="button"
              onClick={onTapConfirm}
              disabled={confirmMut.isPending}
              className="inline-flex items-center gap-2.5 rounded-full bg-sun px-6 py-4 text-[15px] font-bold text-ink shadow-[0_12px_32px_-10px_rgba(248,201,136,.5)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <CheckIcon /> {confirmMut.isPending
                ? 'confirmando…'
                : 'confirmar início'}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-cream/40 px-5 py-4 text-[14px] font-semibold text-cream transition-colors hover:bg-cream/10"
          >
            <ListIcon /> lista de presença
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2.5 rounded-full bg-clay px-5 py-4 text-[14px] font-bold text-cream shadow-[0_12px_32px_-10px_rgba(216,93,52,.6)] transition-transform hover:-translate-y-0.5 hover:bg-clay-d"
          >
            <AlertIcon /> cancelar agora
          </button>
        </div>
        {confirmError && (
          <div className="mt-3 rounded-lg bg-clay-d/30 px-3 py-2 text-[12px] font-medium text-clay">
            {confirmError}
          </div>
        )}
        {!startedConfirmed && !confirmError && (
          <p className="mt-3 text-[11px] leading-snug text-cream/60">
            confirme em até 10 min — depois disso o sistema marca todos os
            alunos como presentes automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}

/// How early (ms before startsAt) the "abrir tela da aula" CTA appears on
/// the next-class card, letting the professor open the AO VIVO screen to
/// get set up before students arrive. Matches the 10-min auto-confirm grace
/// on the backend cron — same "the class is effectively starting" window.
const LIVE_SCREEN_PREP_WINDOW_MS = 10 * 60_000;

function NextClassCard({
  slot,
  onOpenLive,
}: {
  slot: AdminClassSlot;
  onOpenLive: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // 1s tick — when the slot is < 24h away the countdown shows seconds.
    // Above 24h the value is "Xd Yh" so the extra ticks are cheap.
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const startsAt = new Date(slot.startsAt);
  const countdown = formatCountdownSmart(slot.startsAt, now);
  // Within the prep window the professor can already open the live screen
  // to get set up. (`proxima` is always future here, so msUntilStart > 0.)
  const canOpenLive =
    startsAt.getTime() - now <= LIVE_SCREEN_PREP_WINDOW_MS;
  const dataStr = startsAt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const horaStr = startsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-[22px] border border-sand bg-cream p-7">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            sua próxima aula
          </div>
          <div
            className="display-tight mt-2 leading-[.95]"
            style={{ fontSize: 'clamp(36px,5vw,52px)' }}
          >
            {slot.classKind?.name ?? slot.title ?? 'aula'}
          </div>
          <div className="mt-2 text-sm capitalize text-ink-2">
            {dataStr} · {horaStr}
          </div>
        </div>
        <div
          className="grid size-16 place-items-center rounded-2xl"
          style={{
            background: chipBg(slot.classKind?.tone ?? ''),
            color: chipFg(slot.classKind?.tone ?? ''),
          }}
        >
          <span className="display-tight mono text-[20px] leading-none">
            {horaStr.replace(':', '')}
          </span>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-6">
        <Stat label="começa em" value={countdown} mono />
        <Stat label="alunos" value={`${slot.reservedCount}/${slot.capacity}`} mono />
        <Stat label="duração" value={`${slot.durationMinutes} min`} />
      </div>

      {canOpenLive && (
        <button
          type="button"
          onClick={onOpenLive}
          className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[14px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
        >
          <ListIcon /> abrir tela da aula
          <span className="text-cream/60">→</span>
        </button>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span
        className={`display-tight ${mono ? 'mono' : ''} text-[24px] leading-none`}
      >
        {value}
      </span>
    </div>
  );
}

function ShortcutButton({
  title,
  hint,
  icon,
  onClick,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-[14px] border border-sand bg-cream px-5 py-4 text-left transition-colors hover:bg-cream-2"
    >
      <span className="flex flex-col">
        <span className="display-tight text-[20px] leading-none">{title}</span>
        <span className="mt-1 text-xs text-ink-2">{hint}</span>
      </span>
      <span className="text-ink-2">{icon}</span>
    </button>
  );
}

export function SlotList({
  items,
  onCancel,
}: {
  items: AdminClassSlot[];
  onCancel: (slot: AdminClassSlot) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-sand-2 bg-cream-2 px-4 py-7 text-center text-sm text-ink-2">
        nenhuma aula por aqui.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((slot) => (
        <SlotRow key={slot.id} slot={slot} onCancel={onCancel} />
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  onCancel,
}: {
  slot: AdminClassSlot;
  onCancel: (slot: AdminClassSlot) => void;
}) {
  const startsAt = new Date(slot.startsAt);
  const dataStr = startsAt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const horaStr = startsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const cancelable = slot.status === 'SCHEDULED' && startsAt > new Date();
  const status = STATUS_BADGE[slot.status] ?? STATUS_BADGE.SCHEDULED;
  const [head, tail] = dataStr.split(', ');

  return (
    <div className="grid gap-3 rounded-[14px] border border-sand bg-cream px-4 py-3.5 sm:grid-cols-[100px_70px_1fr_auto_auto] sm:items-center">
      <div className="flex flex-col">
        <span className="display-tight text-[18px] capitalize leading-none">
          {head}
        </span>
        <span className="mt-1 text-xs text-ink-2">{tail}</span>
      </div>
      <div className="display-tight mono text-[20px]">{horaStr}</div>
      <div className="flex items-center gap-2.5">
        <span
          className="size-2.5 rounded-xs"
          style={{ background: chipBg(slot.classKind?.tone ?? '') }}
        />
        <span className="display-tight text-[18px]">
          {slot.classKind?.name ?? slot.title ?? 'aula'}
        </span>
        <span className="text-[13px] text-ink-2">
          · {slot.durationMinutes} min · {slot.reservedCount}/{slot.capacity}
        </span>
      </div>
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status.bg} ${status.fg}`}
      >
        {status.label}
      </span>
      {cancelable ? (
        <button
          type="button"
          onClick={() => onCancel(slot)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-clay-d hover:bg-cream-2"
        >
          cancelar
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

const STATUS_BADGE: Record<
  AdminClassSlot['status'],
  { label: string; bg: string; fg: string }
> = {
  SCHEDULED: {
    label: 'confirmada',
    bg: 'bg-[#E5EFE3]',
    fg: 'text-[#3F7A4F]',
  },
  CANCELLED_BEFORE: {
    label: 'cancelada',
    bg: 'bg-[#F1D6CA]',
    fg: 'text-clay-d',
  },
  CANCELLED_DURING: {
    label: 'canc · ao vivo',
    bg: 'bg-[#F1D6CA]',
    fg: 'text-clay-d',
  },
  COMPLETED: {
    label: 'concluída',
    bg: 'bg-cream-2',
    fg: 'text-ink-2',
  },
};

function chipBg(tone: string) {
  const t = tone.toLowerCase();
  if (t.includes('sun') || t.includes('amarelo') || t.includes('almoço'))
    return 'var(--color-sun)';
  if (t.includes('clay') || t.includes('forte') || t.includes('pôr'))
    return 'var(--color-clay)';
  if (t.includes('ink') || t.includes('noturno') || t.includes('noite'))
    return 'var(--color-ink)';
  if (t.includes('sand')) return 'var(--color-sand-2)';
  return 'var(--color-sea)';
}

function chipFg(tone: string) {
  const t = tone.toLowerCase();
  if (t.includes('sun') || t.includes('sand') || t.includes('amarelo'))
    return 'var(--color-ink)';
  return 'var(--color-cream)';
}

function isLive(slot: AdminClassSlot, now: Date) {
  if (slot.status !== 'SCHEDULED') return false;
  const start = new Date(slot.startsAt).getTime();
  const end = start + slot.durationMinutes * 60_000;
  return now.getTime() >= start && now.getTime() <= end;
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'bom dia';
  if (h < 18) return 'boa tarde';
  return 'boa noite';
}

function monthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - 1); // previous month for "concluídas" too
  const end = new Date();
  end.setMonth(end.getMonth() + 2);
  end.setDate(1);
  end.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function ChevRightIcon() {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
