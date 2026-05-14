import { useEffect, useMemo, useRef, useState } from 'react';
import { useMe } from '@/api/me';
import { useUnits, type PublicUnit } from '@/api/public';
import { ALL_ARENAS, useArenaStore } from '@/stores/arena';
import { useAuthStore } from '@/stores/auth';

interface ArenaPickerProps {
  /// Style variants — `nav` is for the public top bar (compact, transparent
  /// background), `panel` is for the dashboard (slightly larger, fits inside
  /// a card). Default `nav`.
  variant?: 'nav' | 'panel';
}

/// Global arena selector backed by `useArenaStore`. Renders nothing while the
/// units list is loading and when there's only a single active arena (no
/// choice to make). Persists between sessions via localStorage in the store.
///
/// Role-aware:
/// - USER / anonymous → all active units, with the "todas as arenas"
///   sentinel option that aggregates content across every active arena.
/// - INSTRUCTOR → only the arenas the instructor is assigned to (`me.arenas`),
///   and the "todas as arenas" option is removed. They must pick exactly one
///   arena at a time so the data they see matches what they can act on.
/// - ADMIN → behaves like USER (admin tooling is arena-scoped via its own
///   sidebar, not this picker).
export function ArenaPicker({ variant = 'nav' }: ArenaPickerProps) {
  const { data: units, isLoading } = useUnits();
  const sessionUser = useAuthStore((s) => s.user);
  // Only fetch /users/me when authenticated to avoid a 401 on the public
  // landing for anonymous visitors.
  const meQ = useMe({ enabled: !!sessionUser });
  const isInstructor = sessionUser?.role === 'INSTRUCTOR';

  const selected = useArenaStore((s) => s.selectedArenaId);
  const setSelected = useArenaStore((s) => s.setSelectedArena);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // For INSTRUCTOR, narrow the list to their assigned arenas. For everyone
  // else, the full active set.
  const eligibleUnits = useMemo<PublicUnit[]>(() => {
    if (!units) return [];
    const active = units.filter((u) => u.isActive);
    if (!isInstructor || !meQ.data) return active;
    const myIds = new Set(meQ.data.arenas.map((a) => a.id));
    return active.filter((u) => myIds.has(u.id));
  }, [units, isInstructor, meQ.data]);

  // INSTRUCTOR can never sit on `'all'`. Snap to the first eligible arena
  // (or, if their selection is no longer in the eligible set after an admin
  // re-assignment, fix it). Effect runs only when there's something to fix
  // so we don't loop.
  useEffect(() => {
    if (!isInstructor || eligibleUnits.length === 0) return;
    const ok = eligibleUnits.some((u) => u.id === selected);
    if (!ok) setSelected(eligibleUnits[0]!.id);
  }, [isInstructor, eligibleUnits, selected, setSelected]);

  if (isLoading || !units) return null;
  // Picker only makes sense when there's a choice to make.
  if (eligibleUnits.length <= 1) return null;

  const current =
    selected === ALL_ARENAS
      ? null
      : eligibleUnits.find((u) => u.id === selected) ?? null;
  const label = current
    ? current.name
    : isInstructor
      ? eligibleUnits[0]!.name
      : 'todas as arenas';

  const trigger =
    variant === 'panel'
      ? 'inline-flex items-center gap-2 rounded-full border border-sand-2 bg-cream px-4 py-2 text-sm font-semibold text-ink hover:border-clay'
      : 'inline-flex items-center gap-2 rounded-full bg-ink/5 px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-ink/10';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={trigger}
        aria-expanded={open}
      >
        <span>{label.toLowerCase()}</span>
        <span className="text-xs opacity-60" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-sand-2 bg-cream py-2 shadow-xl"
        >
          {!isInstructor && (
            <>
              <Option
                label="todas as arenas"
                description="ver tudo"
                isActive={selected === ALL_ARENAS}
                onClick={() => {
                  setSelected(ALL_ARENAS);
                  setOpen(false);
                }}
              />
              <li className="my-1 border-t border-sand-2/60" aria-hidden />
            </>
          )}
          {eligibleUnits.map((u) => (
            <Option
              key={u.id}
              label={u.name.toLowerCase()}
              description={u.address}
              isActive={selected === u.id}
              onClick={() => {
                setSelected(u.id);
                setOpen(false);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Option({
  label,
  description,
  isActive,
  onClick,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-4 py-2 text-left transition-colors hover:bg-ink/5 ${
          isActive ? 'bg-ink/5' : ''
        }`}
      >
        <span className="mt-1 size-2 rounded-full" style={{ background: isActive ? 'var(--color-clay)' : 'transparent', border: isActive ? 'none' : '1.5px solid var(--color-sand-2)' }} aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-xs leading-tight text-ink-2">
            {description}
          </span>
        </span>
      </button>
    </li>
  );
}
