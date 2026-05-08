import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLogout } from '@/hooks/useLogout';
import { Logo } from '@/components/brand/logo';
import { firstName, initials } from '@/lib/format';

export type DashboardTab =
  | 'inicio'
  | 'aulas'
  | 'historico'
  | 'plano'
  | 'amigos';

const TABS: ReadonlyArray<[DashboardTab, string]> = [
  ['inicio', 'início'],
  ['aulas', 'aulas'],
  ['historico', 'histórico'],
  ['plano', 'meu plano'],
  ['amigos', 'amigos'],
];

interface Props {
  tab: DashboardTab;
  onTabChange: (next: DashboardTab) => void;
  /// Display name + email come from the authenticated user. Avatar uses
  /// initials.
  user: { name: string; email: string };
}

export function TopBar({ tab, onTabChange, user }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/" className="flex-shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1.5 rounded-full bg-cream-2 p-[5px] md:flex">
          {TABS.map(([key, label]) => {
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
                style={{
                  background: active ? 'var(--color-ink)' : 'transparent',
                  color: active
                    ? 'var(--color-cream)'
                    : 'var(--color-ink)',
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="relative flex items-center gap-2.5" ref={menuRef}>
          <Link
            to="/reservar"
            className="hidden items-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay-d md:inline-flex"
          >
            reservar bike <span aria-hidden>↗</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full border-[1.5px] border-sand py-1.5 pl-3.5 pr-1.5"
          >
            <span className="hidden text-[13px] font-semibold capitalize md:inline">
              {firstName(user.name)}
            </span>
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-sea text-[13px] font-bold text-cream">
              {initials(user.name)}
            </span>
          </button>
          {/* Always mounted so the enter/exit transition can run. The
              `pointer-events-none` + `aria-hidden` keep it inert when closed. */}
          <div
            aria-hidden={!open}
            className={`absolute right-0 top-[52px] z-50 min-w-[200px] origin-top-right rounded-2xl border border-sand bg-cream p-2 shadow-[0_20px_50px_-20px_rgba(34,28,22,.3)] transition-[transform,opacity] duration-150 ease-out ${
              open
                ? 'pointer-events-auto scale-100 opacity-100'
                : 'pointer-events-none scale-95 opacity-0'
            }`}
          >
            <div className="px-3 py-2 text-xs text-ink-2">{user.email}</div>
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-cream-2"
            >
              meu perfil
            </Link>
            <button
              type="button"
              onClick={logout}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-clay-d hover:bg-cream-2"
            >
              sair
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab strip */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
        {TABS.map(([key, label]) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all"
              style={{
                background: active
                  ? 'var(--color-ink)'
                  : 'var(--color-cream-2)',
                color: active
                  ? 'var(--color-cream)'
                  : 'var(--color-ink)',
              }}
            >
              {label}
            </button>
          );
        })}
        <Link
          to="/reservar"
          className="ml-auto whitespace-nowrap rounded-full bg-clay px-3.5 py-2 text-[13px] font-semibold text-cream"
        >
          + reservar
        </Link>
      </div>
    </header>
  );
}
