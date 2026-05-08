import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AdminClassSlot } from '@/api/admin';
import {
  isInstructorMarkedNoShow,
  useBulkCheckIn,
  useSlotRoster,
  type RosterStudent,
} from '@/api/professor';
import { firstName } from '@/lib/format';

interface Props {
  open: boolean;
  slot: AdminClassSlot | null;
  onClose: () => void;
  onSubmitted?: (summary: {
    checkedIn: number;
    noShow: number;
    ignored: number;
  }) => void;
}

/// Per-row UI state for the check-in board:
///   - "present" — marked CHECKED_IN
///   - "absent" — marked NO_SHOW (instructor-side)
///   - "locked-present" — already CHECKED_IN, can't be downgraded
///   - "locked-user-absent" — user self-marked NO_SHOW; off-limits
type RowMode = 'present' | 'absent' | 'locked-present' | 'locked-user-absent';

/// F3 + item-8/18 — Mobile-first check-in drawer.
///
/// Locks per item-18:
///   - CHECKED_IN rows can't be downgraded to NO_SHOW (presence is final).
///   - User self-marked NO_SHOW rows are locked entirely (the user
///     explicitly opted out — instructor can't override).
///   - Instructor-marked NO_SHOW rows can be flipped back to present (the
///     "I made a mistake" path).
export function CheckInDrawer({ open, slot, onClose, onSubmitted }: Props) {
  const rosterQ = useSlotRoster(open && slot ? slot.id : undefined);
  const bulkMut = useBulkCheckIn();

  // Override map applied on top of the canonical row mode. Only
  // "present"/"absent" entries are valid here; locked rows can't be
  // overridden.
  const [overrides, setOverrides] = useState<
    Map<string, 'present' | 'absent'>
  >(new Map());
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setOverrides(new Map());
      setSearch('');
      setError(null);
      bulkMut.reset();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bulkMut.isPending) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rosterQ.data?.students ?? [];
    if (!q) return list;
    return list.filter((s) => s.user.name.toLowerCase().includes(q));
  }, [rosterQ.data, search]);

  if (!open || !slot) return null;

  const baseModeFor = (s: RosterStudent): RowMode => {
    if (s.status === 'CHECKED_IN') return 'locked-present';
    if (s.status === 'NO_SHOW') {
      return isInstructorMarkedNoShow(s) ? 'absent' : 'locked-user-absent';
    }
    return 'absent'; // ACTIVE defaults to absent until tapped
  };

  const modeFor = (s: RosterStudent): RowMode => {
    const base = baseModeFor(s);
    if (base === 'locked-present' || base === 'locked-user-absent') {
      return base;
    }
    const ovr = overrides.get(s.reservationId);
    if (ovr) return ovr;
    return base;
  };

  const setMode = (s: RosterStudent, next: 'present' | 'absent') => {
    const base = baseModeFor(s);
    if (base === 'locked-present' || base === 'locked-user-absent') return;
    setOverrides((prev) => {
      const m = new Map(prev);
      // Match the base → drop the override so the row reads as canonical.
      if (next === base) m.delete(s.reservationId);
      else m.set(s.reservationId, next);
      return m;
    });
  };

  const allStudents = rosterQ.data?.students ?? [];
  const presentCount = allStudents.filter(
    (s) => modeFor(s) === 'present' || modeFor(s) === 'locked-present',
  ).length;
  const absentCount = allStudents.filter(
    (s) => modeFor(s) === 'absent' || modeFor(s) === 'locked-user-absent',
  ).length;
  const totalCount = allStudents.length;

  const submit = async () => {
    if (!slot) return;
    setError(null);
    // Build the present id list from the effective modes — every row that
    // ends up "present" or "locked-present" goes in. Rows we skipped
    // (locked-user-absent) are absent in the payload, which the backend
    // ignores per its lock rules.
    const presentReservationIds = allStudents
      .filter((s) => {
        const m = modeFor(s);
        return m === 'present' || m === 'locked-present';
      })
      .map((s) => s.reservationId);
    try {
      const summary = await bulkMut.mutateAsync({
        slotId: slot.id,
        presentReservationIds,
      });
      onSubmitted?.(summary);
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Não conseguimos registrar a presença.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex items-end justify-center sm:items-center"
      style={{ animation: 'fadein .25s ease both' }}
    >
      <div
        onClick={bulkMut.isPending ? undefined : onClose}
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
        aria-hidden
      />
      <div
        onClick={(e) => e.stopPropagation()}
        // `min-h-0` on the drawer + body unlocks the inner scroll on
        // mobile (without it, flex children claim their content height
        // and the body overflows the viewport — the bug from item-18).
        className="relative z-[2] flex max-h-[92vh] min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] bg-cream shadow-[0_-30px_80px_rgba(0,0,0,.4)] sm:max-h-[80vh] sm:max-w-[560px] sm:rounded-[28px]"
        style={{ animation: 'slidein .35s cubic-bezier(.2,.7,.2,1) both' }}
      >
        {/* Header */}
        <div className="border-b border-sand bg-cream-2 px-6 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.06em] text-clay">
                lista de presença
              </div>
              <div className="display-tight mt-1 text-[24px] leading-none">
                {slot.classKind?.name ?? slot.title ?? 'aula'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={bulkMut.isPending}
              className="rounded-full p-2 text-ink-2 transition-colors hover:bg-cream disabled:opacity-50"
              aria-label="fechar"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Counter label="presentes" value={presentCount} tone="green" />
            <Counter label="ausentes" value={absentCount} tone="clay" />
            <Counter label="total" value={totalCount} tone="ink" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nome…"
            className="mt-3 w-full rounded-full border-[1.5px] border-sand bg-cream px-4 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </div>

        {/* Body — `min-h-0` mantém o overflow funcionando em mobile */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {rosterQ.isLoading ? (
            <div className="px-2 py-10 text-center text-sm text-ink-2">
              carregando alunos…
            </div>
          ) : rosterQ.isError ? (
            <div className="px-2 py-10 text-center text-sm text-clay-d">
              erro ao carregar lista.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-10 text-center text-sm text-ink-2">
              {search ? 'nenhum aluno bate com a busca.' : 'sem alunos reservados.'}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((al) => {
                const mode = modeFor(al);
                const initials = firstName(al.user.name).slice(0, 2).toUpperCase();
                const isLocked =
                  mode === 'locked-present' || mode === 'locked-user-absent';
                const lockBadge =
                  mode === 'locked-present'
                    ? 'presença confirmada'
                    : mode === 'locked-user-absent'
                      ? 'aluno marcou ausência'
                      : null;
                return (
                  <li
                    key={al.reservationId}
                    className="flex items-center gap-3 rounded-2xl border-[1.5px] border-sand bg-cream px-3 py-2.5"
                    style={{
                      opacity: mode === 'locked-user-absent' ? 0.6 : 1,
                    }}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream-2 text-[14px] font-bold text-ink">
                      {initials || '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold lowercase">
                        {al.user.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-2">
                        bike {al.bikeLabel}
                        {al.isFirstClass ? ' · novato' : ''}
                        {al.promotedFromWaitlist ? ' · veio da fila' : ''}
                        {lockBadge ? ` · ${lockBadge}` : ''}
                      </div>
                    </div>
                    {isLocked ? (
                      <LockBadge mode={mode} />
                    ) : (
                      <div className="flex shrink-0 gap-1.5">
                        <ToggleBtn
                          active={mode === 'absent'}
                          tone="clay"
                          onClick={() => setMode(al, 'absent')}
                          ariaLabel={`marcar ${al.user.name} como ausente`}
                        >
                          ausente
                        </ToggleBtn>
                        <ToggleBtn
                          active={mode === 'present'}
                          tone="green"
                          onClick={() => setMode(al, 'present')}
                          ariaLabel={`marcar ${al.user.name} como presente`}
                        >
                          presente
                        </ToggleBtn>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sand bg-cream-2 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
          {error && (
            <div className="mb-3 rounded-lg bg-clay-d/10 px-4 py-2.5 text-[13px] text-clay-d">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={bulkMut.isPending || totalCount === 0}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-clay text-base font-bold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,.6)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkMut.isPending
              ? 'registrando…'
              : `registrar presença · ${presentCount} de ${totalCount}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-2">
            presenças confirmadas viram definitivas. ausências marcadas pelo
            aluno ficam bloqueadas.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ToggleBtn({
  active,
  tone,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  tone: 'green' | 'clay';
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const activeBg =
    tone === 'green'
      ? 'bg-[#3F7A4F] text-cream'
      : 'bg-clay text-cream';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`min-h-[44px] rounded-full px-3.5 text-[12px] font-bold uppercase tracking-wide transition-colors ${
        active ? activeBg : 'bg-cream-2 text-ink-2 hover:bg-sand/50'
      }`}
    >
      {children}
    </button>
  );
}

function LockBadge({ mode }: { mode: RowMode }) {
  if (mode === 'locked-present') {
    return (
      <span
        className="rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
        style={{ background: '#3F7A4F', color: 'var(--color-cream)' }}
      >
        ✓ presente
      </span>
    );
  }
  if (mode === 'locked-user-absent') {
    return (
      <span
        className="rounded-full border border-clay/40 bg-clay/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-clay-d"
      >
        ausente · aluno
      </span>
    );
  }
  return null;
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'clay' | 'ink';
}) {
  const fg =
    tone === 'green'
      ? '#3F7A4F'
      : tone === 'clay'
        ? 'var(--color-clay)'
        : 'var(--color-ink)';
  return (
    <div className="rounded-xl bg-cream px-2 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
        {label}
      </div>
      <div
        className="display-tight mono mt-0.5 text-[22px] leading-none"
        style={{ color: fg }}
      >
        {value}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
