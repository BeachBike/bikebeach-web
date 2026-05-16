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

interface NavProps {
  /// `full` (default) — usado na Home, com os anchors de seção (#aulas,
  /// #instrutores, #planos, #arena). Esses âncoras só existem na Home;
  /// em qualquer outra página clicar não faria nada.
  ///
  /// `minimal` — pra páginas internas estáticas (FAQ, Termos, Privacidade).
  /// Esconde os anchors de seção e mantém só logo + ArenaPicker + auth.
  /// Mantém a mesma fixação + blur para não criar "outro header" visual.
  variant?: 'full' | 'minimal';
}

/// Fixed nav. Transparent at top, blurred cream once the user scrolls past
/// the hero. Auth-aware (D1 / item 1): logged users see a "abrir painel"
/// CTA wired to their role-specific portal instead of "Entrar / Reservar".
export function Nav({ variant = 'full' }: NavProps = {}) {
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
        paddingTop: scrolled ? 14 : 22,
        paddingBottom: scrolled ? 14 : 22,
        background: scrolled ? 'rgba(246,239,226,.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-2 px-4 transition-all duration-300 ease-out sm:px-7"
    >
      <Link to="/">
        <Logo />
      </Link>

      {variant === 'full' && (
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
      )}

      <div className="flex items-center gap-2">
        {/* Arena picker lives in the nav on desktop; on mobile the bar is
            too tight (logo + auth CTAs), so the landing renders a floating
            chip instead — see LandingRoute. */}
        <div className="hidden md:block">
          <ArenaPicker variant="nav" />
        </div>
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
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink-2 sm:px-5"
            >
              Reservar<span className="hidden sm:inline">&nbsp;bike</span>{' '}
              <span aria-hidden>↗</span>
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
