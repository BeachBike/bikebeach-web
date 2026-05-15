import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ContaAside, type AuthMode } from './aside';

interface Props {
  mode: AuthMode;
  children: ReactNode;
}

/// Two-column auth layout: decorated Aside + form area. The form content is
/// passed in by `children` so login + signup can reuse the same chrome.
export function ContaShell({ mode, children }: Props) {
  return (
    <main className="min-h-svh bg-cream p-6">
      {/* Top-bar: back to home + help */}
      <div className="mx-auto mb-4 flex max-w-[1240px] items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-cream-2"
        >
          ← voltar pra home
        </Link>
      </div>

      {/* Card grid */}
      <div className="mx-auto grid max-w-[1240px] gap-6 rounded-[28px] bg-cream p-3.5 lg:grid-cols-[1.1fr_1fr]">
        <ContaAside mode={mode} />
        <div className="px-2 py-1 lg:px-8">{children}</div>
      </div>

      {/* Footer */}
      <div className="mx-auto mt-6 flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-2 text-[13px] text-ink-2">
        <span>© 2026 bikebeach</span>
        <div className="flex gap-5">
          <Link to="/termos" className="hover:text-clay">
            termos
          </Link>
          <Link to="/privacidade" className="hover:text-clay">
            privacidade
          </Link>
        </div>
      </div>
    </main>
  );
}
