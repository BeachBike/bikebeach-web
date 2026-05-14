import { Link } from 'react-router';
import { ArenaPicker } from '@/components/common/arena-picker';
import { useLogout } from '@/hooks/useLogout';
import type { Me } from '@/api/me';

export type ProfessorTabId = 'dashboard' | 'agenda' | 'alunos';

interface TabDef {
  id: ProfessorTabId;
  label: string;
  icon: 'dash' | 'cal' | 'people';
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'início', icon: 'dash' },
  { id: 'agenda', label: 'minhas aulas', icon: 'cal' },
  { id: 'alunos', label: 'alunos', icon: 'people' },
];

interface ProfessorTopBarProps {
  active: ProfessorTabId;
  onChange: (id: ProfessorTabId) => void;
  me: Me | undefined;
}

export function ProfessorTopBar({
  active,
  onChange,
  me,
}: ProfessorTopBarProps) {
  const logout = useLogout('/login');
  const initials = (me?.name ?? 'PF')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const firstName = me?.name?.split(' ')[0] ?? 'professor';

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-cream/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-5 px-5 py-3.5 sm:px-7 lg:px-8">
        <div className="flex items-center gap-3.5">
          <Link to="/" aria-label="bikebeach">
            <BrandMark size={26} />
          </Link>
          <span className="hidden rounded-full bg-cream-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] text-clay sm:inline">
            portal do professor
          </span>
        </div>

        <nav className="hidden gap-1 rounded-full bg-cream-2 p-1 lg:flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                active === tab.id
                  ? 'bg-ink text-cream'
                  : 'text-ink hover:bg-sand/60'
              }`}
            >
              <NavIcon kind={tab.icon} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Arena picker — for INSTRUCTORs assigned to multiple arenas the
              picker shows only their assigned arenas (no "todas" option) so
              they can switch between them. ArenaGuard ensures the store
              never sits on `'all'` for INSTRUCTOR; the picker just exposes
              the toggle. */}
          <ArenaPicker variant="nav" />
          <div className="hidden flex-col items-end leading-none lg:flex">
            <span className="text-[13px] font-semibold lowercase">
              {me?.name?.toLowerCase() ?? '—'}
            </span>
            <span className="mt-0.5 text-[11px] text-ink-2">
              instrutor{me?.role === 'INSTRUCTOR' ? '' : ' · admin'}
            </span>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-sea text-[13px] font-extrabold text-cream">
            {initials}
          </span>
          <button
            type="button"
            onClick={logout}
            title="sair"
            className="rounded-full p-2 text-ink-2 hover:bg-cream-2"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>

      {/* Mobile tab strip */}
      <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 lg:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${
              active === tab.id
                ? 'bg-ink text-cream'
                : 'bg-cream-2 text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <span className="sr-only">{firstName}</span>
    </header>
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

function NavIcon({ kind }: { kind: 'dash' | 'cal' | 'people' }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'dash') {
    return (
      <svg {...props}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    );
  }
  if (kind === 'cal') {
    return (
      <svg {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
