import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMe } from '@/api/me';
import { useAdminClassSlots } from '@/api/admin';
import { useSlotRoster } from '@/api/professor';
import { useSeatMap } from '@/api/public';
import { ClassClock } from '@/components/professor/live/class-clock';
import { ArenaMap } from '@/components/professor/live/arena-map';
import { LiveActionBar } from '@/components/professor/live/action-bar';
import { LiveCancelModal } from '@/components/professor/live-cancel-modal';
import { Toast } from '@/components/professor/toast';
import { firstName } from '@/lib/format';

/// /professor/aula/:slotId — the "AO VIVO" focused screen.
///
/// **Etapa 1:** chrome + header + adaptive clock + counters.
/// **Etapa 2 (este patch):** live arena map (presença bike-a-bike) + fixed
/// action bar (cancelar emergência / finalizar aula).
///
/// The route is dedicated (not a modal) so the prof can keep it open on a
/// recepção tablet and URLs are sharable. ArenaGuard already enforces
/// instructor membership on the parent /professor route — here we just
/// re-verify the user has rights to manage THIS slot via the roster
/// endpoint (server returns 403 if not).

export function ProfessorLiveRoute() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const meQ = useMe();
  const [toast, setToast] = useState<string | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Pull the slot record from the broader month query so we don't add yet
  // another `/class-slots/:id` endpoint just to render the header. Falls
  // back to roster data if the slot isn't in the active window.
  const rangeFrom = monthAroundIso(new Date(), -7).toISOString();
  const rangeTo = monthAroundIso(new Date(), 90).toISOString();
  const slotsQ = useAdminClassSlots(
    meQ.data?.unitId ?? undefined,
    rangeFrom,
    rangeTo,
  );
  const slot = slotsQ.data?.find((s) => s.id === slotId);
  const rosterQ = useSlotRoster(slotId);
  // Seat map = arena topology (rows/cols) + every bike + occupancy. Reused
  // from the client bike-picker so prof and student see the same arena.
  const seatMapQ = useSeatMap(slotId);

  if (meQ.isLoading || slotsQ.isLoading) {
    return (
      <Shell>
        <div className="px-6 py-10 text-ink-2">carregando aula…</div>
      </Shell>
    );
  }
  if (!meQ.data || (meQ.data.role !== 'INSTRUCTOR' && meQ.data.role !== 'ADMIN')) {
    return (
      <Shell>
        <div className="px-6 py-10 text-clay-d">Acesso negado.</div>
      </Shell>
    );
  }
  if (!slotId || !slot) {
    return (
      <Shell>
        <div className="px-6 py-10">
          <div className="text-ink-2">Essa aula não está na sua agenda.</div>
          <button
            type="button"
            onClick={() => navigate('/professor')}
            className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream"
          >
            ← voltar pra agenda
          </button>
        </div>
      </Shell>
    );
  }

  const reservedCount = rosterQ.data?.reservedCount ?? slot.reservedCount;
  const presentCount =
    rosterQ.data?.students.filter((s) => s.status === 'CHECKED_IN').length ??
    0;
  const noShowCount =
    rosterQ.data?.students.filter((s) => s.status === 'NO_SHOW').length ?? 0;

  return (
    <Shell>
      {/* Breadcrumb back */}
      <div className="border-b border-sand bg-cream px-6 py-3 sm:px-7 lg:px-8">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
          <Link
            to="/professor"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
          >
            ← agenda
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-clay">
            tela ao vivo
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-[1320px] px-5 py-6 sm:px-7 lg:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6 pt-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-clay">
              {formatDateBR(slot.startsAt)} · {slot.durationMinutes} min
            </div>
            <h1
              className="display-tight mt-1.5 leading-[.95]"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}
            >
              {slot.classKind?.name ?? slot.title ?? 'aula'}
              <br />
              <span className="font-normal italic text-ink-2">
                com {firstName(slot.instructor.name).toLowerCase()}.
              </span>
            </h1>
          </div>
          <ClassClock
            startsAtIso={slot.startsAt}
            durationMinutes={slot.durationMinutes}
          />
        </header>

        {/* Quick stats — placeholder until the bike map lands in etapa 2 */}
        <section className="mt-8 grid gap-3.5 sm:grid-cols-4">
          <Counter
            label="reservados"
            value={reservedCount}
            sub={`de ${slot.capacity}`}
            tone="ink"
          />
          <Counter
            label="presentes"
            value={presentCount}
            tone="green"
          />
          <Counter
            label="ausentes"
            value={noShowCount}
            tone="clay"
          />
          <Counter
            label="vagas"
            value={Math.max(0, slot.capacity - reservedCount)}
            tone="sea"
          />
        </section>

        {/* Mapa da arena ao vivo */}
        <div className="mt-8">
          {seatMapQ.isLoading || rosterQ.isLoading ? (
            <div className="rounded-[20px] border border-sand bg-cream-2 px-8 py-14 text-center text-sm text-ink-2">
              montando o mapa da arena…
            </div>
          ) : seatMapQ.isError || rosterQ.isError ? (
            <div className="rounded-[20px] border-[1.5px] border-clay/40 bg-clay/10 px-8 py-10 text-center text-sm text-clay-d">
              Não consegui carregar o mapa dessa aula. Atualiza a página —
              se persistir, fala com o suporte.
            </div>
          ) : seatMapQ.data && rosterQ.data ? (
            <ArenaMap
              slotId={slot.id}
              seatMap={seatMapQ.data}
              roster={rosterQ.data}
            />
          ) : null}
        </div>
      </main>

      {/* Barra de ações fixa — cancelar emergência + finalizar aula */}
      <LiveActionBar
        slot={slot}
        onEmergencyCancel={() => setEmergencyOpen(true)}
        onFinalized={() =>
          setToast('Aula finalizada — presenças e ausências fechadas.')
        }
      />

      <LiveCancelModal
        open={emergencyOpen}
        slot={emergencyOpen ? slot : null}
        onClose={() => setEmergencyOpen(false)}
        onCancelled={() =>
          setToast('Cancelamento de emergência registrado — créditos devolvidos.')
        }
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

/// `pb-28` clears the fixed `LiveActionBar` so the arena map's last row is
/// never hidden behind it.
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream pb-28">{children}</div>;
}

function Counter({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone: 'ink' | 'green' | 'clay' | 'sea';
}) {
  const fg =
    tone === 'green'
      ? '#3F7A4F'
      : tone === 'clay'
        ? 'var(--color-clay)'
        : tone === 'sea'
          ? 'var(--color-sea)'
          : 'var(--color-ink)';
  return (
    <div className="rounded-2xl border border-sand bg-cream px-5 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[.12em] text-ink-2">
        {label}
      </div>
      <div
        className="display-tight mono mt-1 text-[40px] leading-none"
        style={{ color: fg }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

function monthAroundIso(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
