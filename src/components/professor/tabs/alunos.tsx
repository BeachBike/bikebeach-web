import { useMemo, useState } from 'react';
import {
  type AdminClassSlot,
  useAdminClassSlots,
} from '@/api/admin';
import type { Me } from '@/api/me';
import { useSlotRoster } from '@/api/professor';
import { ParticipantHealthModal } from '@/components/saude/participant-health-modal';
import { useArenaStore } from '@/stores/arena';

interface AlunosTabProps {
  me: Me;
}

export function AlunosTab({ me }: AlunosTabProps) {
  const range = upcomingRange();
  const selectedArena = useArenaStore((s) => s.selectedArenaId);
  const slotsQ = useAdminClassSlots(
    selectedArena === 'all' ? me.unitId ?? undefined : selectedArena,
    range.from,
    range.to,
  );
  const [pickedId, setPickedId] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    const now = new Date();
    return (slotsQ.data ?? [])
      .filter(
        (s) =>
          s.instructorId === me.id &&
          s.status === 'SCHEDULED' &&
          new Date(s.startsAt).getTime() + s.durationMinutes * 60_000 >
            now.getTime(),
      )
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [slotsQ.data, me.id]);

  const live = upcoming.find((s) => isLive(s));
  const focusSlot =
    upcoming.find((s) => s.id === pickedId) ?? live ?? upcoming[0] ?? null;

  return (
    <div className="fadein">
      <section className="pb-2 pt-7">
        <div className="text-sm font-semibold text-clay">
          {live ? 'agora na arena' : 'quem vem na próxima'}
        </div>
        <div
          className="display-tight mt-1.5 leading-[.95]"
          style={{ fontSize: 'clamp(28px,6vw,72px)' }}
        >
          alunos.
        </div>
      </section>

      {upcoming.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-2">
          {upcoming.slice(0, 6).map((s) => {
            const isFocus = focusSlot?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setPickedId(s.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  isFocus
                    ? 'bg-ink text-cream'
                    : 'bg-cream-2 text-ink hover:bg-sand/60'
                }`}
              >
                {labelFor(s)}
              </button>
            );
          })}
        </div>
      )}

      {focusSlot ? (
        <RosterBlock slot={focusSlot} />
      ) : (
        <div className="mt-6 rounded-[14px] border border-dashed border-sand-2 bg-cream-2 px-4 py-7 text-center text-sm text-ink-2">
          Sem aulas próximas. Marque uma aula para ver os alunos aqui.
        </div>
      )}
    </div>
  );
}

function RosterBlock({ slot }: { slot: AdminClassSlot }) {
  const rosterQ = useSlotRoster(slot.id);
  const startsAt = new Date(slot.startsAt);
  const [selected, setSelected] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-[18px] bg-cream-2 px-6 py-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-clay">
            {isLive(slot) ? 'ao vivo agora' : 'próxima aula'}
          </div>
          <div className="display-tight mt-1 text-[28px] leading-none">
            {slot.classKind?.name ?? slot.title ?? 'aula'}
          </div>
          <div className="mt-1 text-[13px] capitalize text-ink-2">
            {startsAt.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
            })}{' '}
            ·{' '}
            {startsAt.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-6">
          <Stat
            label="inscritos"
            value={`${rosterQ.data?.reservedCount ?? slot.reservedCount}/${slot.capacity}`}
          />
          <Stat
            label="primeira vez"
            value={
              rosterQ.data
                ? rosterQ.data.students.filter((s) => s.isFirstClass).length
                : 0
            }
          />
          <Stat
            label="lista de espera"
            value={rosterQ.data?.waitlistCount ?? 0}
          />
        </div>
      </div>

      {rosterQ.isLoading ? (
        <div className="mt-6 text-ink-2">Carregando alunos...</div>
      ) : rosterQ.isError ? (
        <div className="mt-6 text-clay-d">Erro ao carregar alunos.</div>
      ) : rosterQ.data && rosterQ.data.students.length > 0 ? (
        <div className="mt-5 grid gap-2.5" style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))',
        }}>
          {rosterQ.data.students.map((al) => {
            const initials = al.user.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const checkedIn = al.status === 'CHECKED_IN';
            return (
              <button
                key={al.reservationId}
                type="button"
                onClick={() =>
                  setSelected({ userId: al.user.id, name: al.user.name })
                }
                className="flex items-center gap-3 rounded-[14px] border border-sand bg-cream px-4 py-3 text-left transition-colors hover:bg-cream-2"
                style={
                  al.healthFlagged
                    ? { borderColor: 'var(--color-clay)' }
                    : undefined
                }
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream-2 text-[13px] font-bold text-ink">
                  {initials || '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold lowercase">
                      {al.user.name}
                    </span>
                    {al.healthFlagged && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream"
                        style={{ background: 'var(--color-clay-d)' }}
                        title="PAR-Q com pontos de atenção"
                      >
                        ⚠ saúde
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-2">
                    {al.presencaCount} aulas
                    {checkedIn ? ' · presente ✓' : ''}
                    {al.promotedFromWaitlist ? ' · veio da lista' : ''}
                    {' · '}
                    <span className="text-clay">ver PAR-Q</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    al.isFirstClass
                      ? 'bg-sun text-ink'
                      : 'bg-cream-2 text-ink'
                  }`}
                >
                  {al.isFirstClass ? 'novato' : `bike ${al.bikeLabel}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border border-dashed border-sand-2 bg-cream-2 px-4 py-7 text-center text-sm text-ink-2">
          Nenhum aluno reservado ainda.
        </div>
      )}

      <ParticipantHealthModal
        slotId={slot.id}
        student={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[.05em] opacity-70">
        {label}
      </span>
      <span className="display-tight mono text-[26px] leading-none">
        {value}
      </span>
    </div>
  );
}

function isLive(slot: AdminClassSlot) {
  const now = Date.now();
  const start = new Date(slot.startsAt).getTime();
  const end = start + slot.durationMinutes * 60_000;
  return now >= start && now <= end && slot.status === 'SCHEDULED';
}

function labelFor(slot: AdminClassSlot) {
  const d = new Date(slot.startsAt);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short' }).split(',')[0]} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function upcomingRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1); // include in-progress classes
  const end = new Date();
  end.setDate(end.getDate() + 14);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}
