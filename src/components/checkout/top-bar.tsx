import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';

/// Sticky bar with a "secure environment" reassurance pill — Asaas does the
/// heavy lifting; the page just renders the QR code it returns.
export function CheckoutTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs font-semibold text-ink-2 md:flex">
            <span className="h-2 w-2 rounded-full bg-sea" />
            ambiente seguro · processado pela asaas
          </span>
          <Link
            to="/dashboard"
            className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
          >
            ← cancelar
          </Link>
        </div>
      </div>
    </header>
  );
}
