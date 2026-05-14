import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useLogout } from '@/hooks/useLogout';
import {
  type AdminLiveSlot,
  type ClassKindColor,
  useAdminLiveClass,
  useAdminUnits,
} from '@/api/admin';
import { useAdminArena } from '@/stores/admin-arena';

export type AdminTabId =
  | 'vision'
  | 'calendar'
  | 'arenas'
  | 'instructors'
  | 'class-kinds'
  | 'plans'
  | 'bikes';

type NavIconKind = 'dash' | 'cal' | 'people' | 'tag' | 'bike' | 'arena';

const NAV: { id: AdminTabId; label: string; icon: NavIconKind }[] = [
  { id: 'vision', label: 'visão geral', icon: 'dash' },
  { id: 'calendar', label: 'calendário', icon: 'cal' },
  { id: 'arenas', label: 'arenas', icon: 'arena' },
  { id: 'instructors', label: 'professores', icon: 'people' },
  { id: 'class-kinds', label: 'tipos de aula', icon: 'tag' },
  { id: 'plans', label: 'planos & pacotes', icon: 'tag' },
  { id: 'bikes', label: 'bikes', icon: 'bike' },
];

interface ShellProps {
  active: AdminTabId;
  onChange: (id: AdminTabId) => void;
}

/// Tabs that depend on a single arena context (calendar / instructors /
/// bikes / vision). The sticky `ArenaContextSelector` decides which arena
/// they read. Tabs scoped to the whole tenant (arenas / class-kinds /
/// plans) ignore the context.
const ARENA_SCOPED_TABS: ReadonlySet<AdminTabId> = new Set([
  'vision',
  'calendar',
  'instructors',
  'bikes',
]);

const COLLAPSED_KEY = 'bb-admin-sidebar-collapsed';

/// Persist the collapsed state in localStorage so the admin's preference
/// survives reloads. Falls back to expanded on first visit.
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });
  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  return [collapsed, setCollapsed] as const;
}

export function AdminSidebar({ active, onChange }: ShellProps) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  // Densities tuned so the full chrome (brand + arena + 7 nav + live + user
  // strip) fits naturally on a ~640px-tall viewport without scrolling. The
  // collapse toggle is the safety valve for anything tighter.
  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col gap-1.5 border-r border-black bg-ink text-cream transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-[68px] p-[16px_10px]' : 'w-60 p-[18px_14px]'
      }`}
    >
      <div
        className={`flex items-center ${
          collapsed ? 'flex-col gap-1.5' : 'justify-between gap-1.5 pb-1.5'
        }`}
      >
        <BrandLink collapsed={collapsed} />
        <CollapseToggle
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      <ArenaContextSelector
        collapsed={collapsed}
        dim={!ARENA_SCOPED_TABS.has(active)}
      />

      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          title={collapsed ? item.label : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={`flex items-center rounded-xs text-left text-sm font-semibold transition-colors ${
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
          } ${
            active === item.id
              ? 'bg-clay text-cream'
              : 'text-cream/80 hover:bg-cream/5'
          }`}
        >
          <NavIcon kind={item.icon} />
          {!collapsed && <span>{item.label}</span>}
        </button>
      ))}

      <div className="flex-1" />

      <ArenaLiveWidget collapsed={collapsed} />
      <UserStrip collapsed={collapsed} />
    </aside>
  );
}

function CollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid size-7 shrink-0 place-items-center rounded-xs text-cream/55 transition-colors hover:bg-cream/10 hover:text-cream"
      aria-label={collapsed ? 'expandir menu' : 'recolher menu'}
      title={collapsed ? 'expandir' : 'recolher'}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points={collapsed ? '9 6 15 12 9 18' : '15 6 9 12 15 18'} />
      </svg>
    </button>
  );
}

/// Sticky arena selector pinned to the sidebar. Reads/writes the
/// `useAdminArena` store; persists across tabs + reloads. The dropdown
/// lists active arenas first, inactives at the bottom (admin can still
/// switch into one to reactivate it). When the active tab is global
/// (planos / kinds / arenas) we dim the chip so the admin sees the
/// context isn't being applied right now.
function ArenaContextSelector({
  dim,
  collapsed = false,
}: {
  dim: boolean;
  collapsed?: boolean;
}) {
  const unitsQ = useAdminUnits(true);
  const selectedId = useAdminArena((s) => s.selectedArenaId);
  const setArena = useAdminArena((s) => s.setArena);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const units = unitsQ.data ?? [];
  const active = units.filter((u) => u.isActive);
  const inactive = units.filter((u) => !u.isActive);
  const selected =
    units.find((u) => u.id === selectedId) ?? active[0] ?? null;

  // Promote first active arena to the persisted store on first render so
  // every tab has a stable context to render against.
  useEffect(() => {
    if (!selectedId && active[0]) setArena(active[0].id);
  }, [selectedId, active, setArena]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Collapsed: chip-only trigger. The dropdown floats to the right of the
  // sidebar so it doesn't get clipped by the narrow rail.
  if (collapsed) {
    return (
      <div ref={ref} className="relative pb-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 w-full place-items-center rounded-xs border border-cream/15 bg-cream/5 transition-colors hover:bg-cream/10"
          style={{ opacity: dim ? 0.55 : 1 }}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={selected ? `arena: ${selected.name.toLowerCase()}` : 'sem arena'}
        >
          <span className="grid size-7 place-items-center rounded-full bg-sun/30 text-[12px] text-sun">
          </span>
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-full top-0 z-50 ml-2 max-h-[60vh] w-56 overflow-y-auto rounded-xs border border-cream/15 bg-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)]"
          >
            <ArenaList
              active={active}
              inactive={inactive}
              selectedId={selectedId}
              onPick={(id) => {
                setArena(id);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2.5 rounded-xs border border-cream/15 bg-cream/5 px-3 py-2 text-left transition-colors hover:bg-cream/10"
        style={{ opacity: dim ? 0.55 : 1 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="grid size-7 place-items-center rounded-full bg-sun/30 text-[11px] text-sun">
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[.06em] text-cream/55">
            arena
          </div>
          <div className="truncate text-[13px] font-semibold text-cream">
            {selected ? selected.name.toLowerCase() : 'sem arena'}
          </div>
        </div>
        <span className="text-cream/55 transition-transform" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-[60vh] overflow-y-auto rounded-xs border border-cream/15 bg-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)]"
        >
          <ArenaList
            active={active}
            inactive={inactive}
            selectedId={selectedId}
            onPick={(id) => {
              setArena(id);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

type ArenaUnit = ReturnType<typeof useAdminUnits>['data'] extends
  | (infer U)[]
  | undefined
  ? U
  : never;

function ArenaList({
  active,
  inactive,
  selectedId,
  onPick,
}: {
  active: ArenaUnit[];
  inactive: ArenaUnit[];
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <>
      {active.length === 0 && inactive.length === 0 && (
        <div className="px-3 py-3 text-[12px] text-cream/55">
          Crie uma arena pra começar.
        </div>
      )}
      {active.length > 0 && (
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.06em] text-cream/40">
          ativas
        </div>
      )}
      {active.map((u) => (
        <button
          key={u.id}
          type="button"
          role="option"
          aria-selected={u.id === selectedId}
          onClick={() => onPick(u.id)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-cream/10 ${
            u.id === selectedId
              ? 'bg-clay/30 font-semibold text-cream'
              : 'text-cream/85'
          }`}
        >
          <span className="size-1.5 rounded-full bg-sun/80" />
          <span className="truncate">{u.name.toLowerCase()}</span>
          <span className="ml-auto text-[10px] text-cream/45">
            {u.operationalBikeCount}
          </span>
        </button>
      ))}
      {inactive.length > 0 && (
        <div className="border-t border-cream/10 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.06em] text-cream/40">
          inativas
        </div>
      )}
      {inactive.map((u) => (
        <button
          key={u.id}
          type="button"
          role="option"
          aria-selected={u.id === selectedId}
          onClick={() => onPick(u.id)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] italic transition-colors hover:bg-cream/10 ${
            u.id === selectedId
              ? 'bg-clay/20 font-semibold text-cream'
              : 'text-cream/55'
          }`}
        >
          <span className="size-1.5 rounded-full bg-cream/30" />
          <span className="truncate">{u.name.toLowerCase()}</span>
          <span className="ml-auto text-[10px] text-cream/35">
            desativada
          </span>
        </button>
      ))}
    </>
  );
}

export function AdminMobileBar({ active, onChange }: ShellProps) {
  return (
    <header className="sticky top-0 z-50 bg-ink px-[18px] py-3.5 text-cream lg:hidden">
      <div className="flex items-center justify-between">
        <BrandMark size={22} />
        <span className="text-[11px] font-bold uppercase tracking-[.06em] text-sun">
          admin
        </span>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${
              active === item.id ? 'bg-clay' : 'bg-cream/8'
            } text-cream`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function BrandLink({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <a
      href="/"
      className="flex items-center gap-2.5 px-1 leading-none"
      title="bikebeach · admin"
    >
      <svg width={26} height={26} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="var(--color-clay)" />
        <path
          d="M5 22 Q11 17 16 22 T27 22"
          stroke="var(--color-cream)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="16" cy="13" r="2.4" fill="var(--color-cream)" />
      </svg>
      {!collapsed && (
        <span className="display-tight" style={{ fontSize: 22 }}>
          bikebeach
        </span>
      )}
    </a>
  );
}

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="var(--color-clay)" />
        <path
          d="M5 22 Q11 17 16 22 T27 22"
          stroke="var(--color-cream)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="16" cy="13" r="2.4" fill="var(--color-cream)" />
      </svg>
      <span
        className="display-tight leading-none"
        style={{ fontSize: size * 0.85 }}
      >
        bikebeach
      </span>
    </span>
  );
}

function NavIcon({ kind }: { kind: NavIconKind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'dash') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    );
  }
  if (kind === 'cal') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (kind === 'people') {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (kind === 'tag') {
    return (
      <svg {...common}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7" y2="7" />
      </svg>
    );
  }
  if (kind === 'arena') {
    // Praia / palmeira-style pin: arch + sand wave
    return (
      <svg {...common}>
        <path d="M21 10c0 5-9 12-9 12s-9-7-9-12a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6l-3 11.5L5.5 17.5 9 9l4-3 5 8.5" />
    </svg>
  );
}

/// Item 20 — sidebar AO VIVO widget. Polls `/admin/live-class` every 30s
/// (handled inside the hook). Shows the live class with biggest crowd OR
/// a calm "sem aulas no momento" idle state. In collapsed mode the widget
/// shrinks to a pulse dot (live) or hides entirely (idle).
function ArenaLiveWidget({ collapsed = false }: { collapsed?: boolean }) {
  const { data: live, isLoading } = useAdminLiveClass();

  if (collapsed) {
    if (!live) return null;
    const dotColor = live.kind
      ? colorTokenToCss(live.kind.colorToken)
      : 'var(--color-clay)';
    return (
      <div
        className="grid place-items-center rounded-sm bg-cream/6 py-2"
        title={`ao vivo · ${live.kind?.name ?? live.title ?? 'aula'}`}
      >
        <span
          className="bb-pulse size-2 rounded-full"
          style={{ background: dotColor }}
        />
      </div>
    );
  }

  if (isLoading && !live) {
    return (
      <div className="rounded-sm bg-cream/6 px-3 py-2.5 text-[11px] text-cream/50">
        carregando…
      </div>
    );
  }

  if (!live) {
    return (
      <div className="rounded-sm bg-cream/6 px-3 py-2.5 text-[11px] text-cream/65">
        <span className="font-bold uppercase tracking-[.05em] text-cream/60">
          ao vivo
        </span>{' '}
        · sem aulas agora
      </div>
    );
  }

  return <LiveClassPanel slot={live} />;
}

function LiveClassPanel({ slot }: { slot: AdminLiveSlot }) {
  const remaining = useCountdown(slot.endsAt);
  const dotColor = slot.kind ? colorTokenToCss(slot.kind.colorToken) : 'var(--color-clay)';
  return (
    <div className="rounded-sm bg-cream/6 p-3 text-xs text-cream/80">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-sun">
          <span
            className="size-1.5 rounded-full bb-pulse"
            style={{ background: dotColor }}
          />
          ao vivo
        </span>
        <span className="mono text-[11px] font-semibold text-sun">
          {remaining}
        </span>
      </div>
      <div className="display-tight mt-1 text-[18px] leading-tight text-cream">
        {slot.kind?.name ?? slot.title ?? 'aula'}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-cream/70">
        {slot.instructor.name.toLowerCase()} · {slot.unit.name}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span>
          {slot.reservedCount}/{slot.capacity} alunos
        </span>
        {slot.presentCount > 0 && (
          <span className="text-cream/60">{slot.presentCount} presentes</span>
        )}
      </div>
    </div>
  );
}

const COLOR_TOKEN_CSS: Record<ClassKindColor, string> = {
  CLAY: 'var(--color-clay)',
  SUN: 'var(--color-sun)',
  SEA: 'var(--color-sea)',
  SAND: 'var(--color-sand-2)',
  INK: 'var(--color-ink)',
  GREEN: 'var(--color-success)',
};

function colorTokenToCss(token: ClassKindColor) {
  return COLOR_TOKEN_CSS[token] ?? COLOR_TOKEN_CSS.SEA;
}

/// Live `mm:ss` countdown to the given ISO string. Updates each second.
/// Falls back to `00:00` once the deadline passes — the polling hook will
/// drop the live slot from the response shortly after.
function useCountdown(deadlineIso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(deadlineIso).getTime() - now);
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/// Item 21 — user strip. Avatar + email + logout. In collapsed mode it
/// becomes a centered avatar with a small icon-only logout below.
function UserStrip({ collapsed = false }: { collapsed?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout('/login');

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';
  const display = user?.email?.split('@')[0]?.toLowerCase() ?? '—';
  const role = user?.role === 'ADMIN' ? 'admin global' : 'operações';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 border-t border-cream/10 pt-2.5">
        <span
          className="grid size-9 place-items-center rounded-full bg-sun text-[13px] font-extrabold text-ink"
          title={display}
        >
          {initials}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="sair"
          title="sair"
          className="grid size-7 place-items-center rounded-xs text-cream/65 transition-colors hover:bg-cream/10 hover:text-cream"
        >
          <LogoutIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 border-t border-cream/10 pt-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun text-[13px] font-extrabold text-ink">
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[13px] font-semibold text-cream">
          {display}
        </span>
        <span className="text-[10px] uppercase tracking-[.06em] text-cream/55">
          {role}
        </span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="sair"
        title="sair"
        className="grid size-8 shrink-0 place-items-center rounded-xs text-cream/65 transition-colors hover:bg-cream/10 hover:text-cream"
      >
        <LogoutIcon />
      </button>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
