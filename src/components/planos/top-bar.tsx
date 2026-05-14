import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { firstName, initials } from '@/lib/format';
import { useLogout } from '@/hooks/useLogout';

interface Props {
  /// User session if logged in. When null we render the public-marketing
  /// version (entrar / criar conta). When set we mirror the dashboard's
  /// chrome so the page feels like a continuation of the app.
  user: { name: string; email: string } | null;
}

export function PlanosTopBar({ user }: Props) {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3.5">
        <Link to={user ? '/dashboard' : '/'}>
          <Logo />
        </Link>

        {user ? (
          <div className="flex items-center gap-2.5">
            <Link
              to="/reservar"
              className="hidden rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay-d md:inline-flex"
            >
              reservar bike ↗
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 rounded-full border-[1.5px] border-sand py-1.5 pl-3.5 pr-1.5 transition-colors hover:bg-cream-2"
              title="abrir painel"
            >
              <span className="hidden text-[13px] font-semibold capitalize md:inline">
                {firstName(user.name)}
              </span>
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-sea text-[13px] font-bold text-cream">
                {initials(user.name)}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => logout('/')}
              className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-cream-2 hover:text-clay-d"
              title="sair"
              aria-label="sair"
            >
              {/* small logout glyph — same shape as the dashboard top-bar */}
              <svg
                width="15"
                height="15"
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
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-ink"
            >
              entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream"
            >
              criar conta
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
