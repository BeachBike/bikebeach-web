import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';

interface FabProps {
  onClick: () => void;
}

/// Floating help button — sits at the bottom-right of the dashboard,
/// always reachable on mobile. Controlled by the parent (the dashboard
/// owns the sheet open state so the Footer "ajuda" link can open it too).
/// Uses `safe-area-inset-bottom` so it stays above the iOS gesture bar.
export function HelpFab({ onClick }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir ajuda"
      className="fixed right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-ink text-cream shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}
    >
      <span className="display-tight text-2xl leading-none">?</span>
    </button>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /// Disparado quando o user clica "rever tour" — o pai abre o
  /// OnboardingTour, sem mexer no flag de backend (apenas reabre a UI).
  onReplayTour: () => void;
}

/// Bottom-sheet (mobile) / centered card (desktop) with 3 help actions:
/// replay tour, FAQ, WhatsApp. Controlled — parent decides when to render.
export function HelpSheet({ open, onClose, onReplayTour }: SheetProps) {
  // Lock body scroll while the sheet is open. Escape closes.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(<HelpSheetBody onClose={onClose} onReplayTour={onReplayTour} />, document.body);
}

function HelpSheetBody({
  onClose,
  onReplayTour,
}: {
  onClose: () => void;
  onReplayTour: () => void;
}) {
  // Escape closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ajuda"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-[24px] bg-cream p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.4)] sm:rounded-[24px] sm:pb-6"
        style={{
          animation: 'slidein 0.32s cubic-bezier(0.2,0.7,0.2,1) both',
        }}
      >
        {/* drag handle visual on mobile */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-sand sm:hidden" />

        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
            precisa de ajuda?
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full bg-cream-2 text-ink-2 hover:bg-sand"
          >
            ✕
          </button>
        </div>

        <div className="display-tight mt-2 text-[26px] leading-[1.05]">
          a gente te socorre.
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Action
            label="rever o tour"
            sub="a explicação rápida das partes principais"
            onClick={onReplayTour}
          />
          <Action
            label="perguntas frequentes"
            sub="janela de 8h, créditos, lista de espera"
            href="/faq"
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function Action({
  label,
  sub,
  onClick,
  href,
  onClose,
}: {
  label: string;
  sub: string;
  onClick?: () => void;
  href?: string;
  onClose?: () => void;
}) {
  const content = (
    <>
      <div className="flex-1 text-left">
        <div className="text-[15px] font-semibold text-ink">{label}</div>
        <div className="text-[12px] text-ink-2">{sub}</div>
      </div>
      <span className="text-ink-2">→</span>
    </>
  );
  const className =
    'flex items-center gap-3 rounded-2xl border border-sand bg-cream px-3.5 py-3 transition-colors hover:bg-cream-2';
  if (href) {
    return (
      <Link to={href} className={className} onClick={onClose}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
