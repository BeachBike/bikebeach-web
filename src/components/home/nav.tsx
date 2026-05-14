import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { ArenaPicker } from '@/components/common/arena-picker';
import { useAuthStore } from '@/stores/auth';
import { useRoleHome } from '@/hooks/useRoleHome';

const LINKS = [
  ['Aulas', '#aulas'],
  ['Instrutores', '#instrutores'],
  ['Planos', '#planos'],
  ['A arena', '#arena'],
] as const;

/// Fixed nav. Transparent at top, blurred cream once the user scrolls past
/// the hero. Auth-aware (D1 / item 1): logged users see a "abrir painel"
/// CTA wired to their role-specific portal instead of "Entrar / Reservar".
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const user = useAuthStore((s) => s.user);
  const home = useRoleHome();

  return (
    <nav
      style={{
        padding: scrolled ? '14px 28px' : '22px 28px',
        background: scrolled ? 'rgba(246,239,226,.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between transition-all duration-300 ease-out"
    >
      <Link to="/">
        <Logo />
      </Link>

      <div className="hidden gap-8 text-[15px] font-medium md:flex">
        {LINKS.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="text-ink transition-colors hover:text-clay"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <ArenaPicker variant="nav" />
        {user && home ? (
          <Link
            to={home}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink-2"
          >
            <Avatar name={user.email} />
            <span className="hidden sm:inline">abrir painel</span>
            <span className="hidden sm:inline" aria-hidden>
              ↗
            </span>
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-ink"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink-2"
            >
              Reservar bike <span aria-hidden>↗</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || 'AB').slice(0, 2).toUpperCase();
  return (
    <span className="grid size-7 place-items-center rounded-full bg-sun text-[11px] font-extrabold text-ink">
      {initials}
    </span>
  );
}
