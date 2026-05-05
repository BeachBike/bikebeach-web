import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';

interface Props {
  step: number; // 0..2 (intro is rendered before the topbar shows step text)
  showStep: boolean;
}

/// Compact sticky bar — same chrome as the dashboard but with a step
/// indicator instead of the tab switcher.
export function ReservarTopBar({ step, showStep }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/dashboard">
          <Logo />
        </Link>
        {showStep && (
          <div className="hidden text-xs font-bold uppercase tracking-wide text-ink-2 md:block">
            reserva · passo {step + 1} de 3
          </div>
        )}
        <Link
          to="/dashboard"
          className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
        >
          ← painel
        </Link>
      </div>
    </header>
  );
}
