import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { useAuthStore } from '@/stores/auth';
import { useRoleHome } from '@/hooks/useRoleHome';

interface FooterColumn {
  title: string;
  items: { label: string; href: string }[];
}

export function Footer() {
  const user = useAuthStore((s) => s.user);
  const home = useRoleHome();

  // Auth-aware "conta" column (D3 / item 1): logged users see shortcuts to
  // their portal; visitors see the funnel CTAs.
  const contaColumn: FooterColumn = user
    ? {
        title: 'sua conta',
        items: [
          { label: 'abrir painel', href: home ?? '/dashboard' },
          ...(user.role === 'USER'
            ? [
                { label: 'minhas reservas', href: '/dashboard?tab=aulas' },
                { label: 'meus pacotes', href: '/dashboard?tab=plano' },
              ]
            : []),
          ...(user.role === 'INSTRUCTOR'
            ? [{ label: 'minhas aulas', href: '/professor' }]
            : []),
          ...(user.role === 'ADMIN'
            ? [{ label: 'admin · operações', href: '/admin' }]
            : []),
        ],
      }
    : {
        title: 'conta',
        items: [
          { label: 'entrar', href: '/login' },
          { label: 'criar conta', href: '/cadastro' },
          { label: 'esqueci a senha', href: '/login' },
        ],
      };

  const columns: FooterColumn[] = [
    {
      title: 'aulas',
      items: [
        { label: 'aulas de hoje', href: '#aulas' },
        { label: 'instrutores', href: '#instrutores' },
        { label: 'planos & pacotes', href: '/planos' },
        { label: 'reservar bike', href: home ?? '/cadastro' },
      ],
    },
    contaColumn,
    {
      title: 'a casa',
      items: [
        { label: 'a arena', href: '#arena' },
        { label: 'como funciona', href: '#como' },
        { label: 'perguntas frequentes', href: '/faq' },
      ],
    },
  ];

  return (
    <footer className="bg-cream px-7 pb-8 pt-14">
      <div className="grid gap-10 pt-6 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-ink-2">
            Spinning na faixa de areia.
            <br />
            Balneário Camboriú · Santa Catarina.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[.18em] text-ink-3">
            onde a areia encontra o mar
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <div
              className="display-tight text-clay"
              style={{ fontSize: 18 }}
            >
              {col.title}
            </div>
            <ul className="mt-4 flex flex-col gap-2.5 list-none text-sm">
              {col.items.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-3.5 border-t border-sand pt-5 text-[13px] text-ink-2">
        <span>© 2026 bikebeach</span>
        <span className="hidden md:inline">
          feito onde a areia encontra o mar
        </span>
        <span>
          <Link to="/faq" className="hover:text-clay">
            faq
          </Link>
          <span className="mx-2 text-ink-3">·</span>
          <Link to="/termos" className="hover:text-clay">
            termos
          </Link>
          <span className="mx-2 text-ink-3">·</span>
          <Link to="/privacidade" className="hover:text-clay">
            privacidade
          </Link>
        </span>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  // External / mailto / hash → plain anchor. Internal route → React Router Link.
  const isExternal =
    href.startsWith('http') ||
    href.startsWith('mailto:') ||
    href.startsWith('#');
  if (isExternal) {
    return (
      <a
        href={href}
        className="text-ink transition-colors hover:text-clay"
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className="text-ink transition-colors hover:text-clay">
      {children}
    </Link>
  );
}
