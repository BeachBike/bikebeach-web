import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return createPortal(
    <div
      className="fixed bottom-6 left-1/2 z-[700] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-5 py-3.5 text-cream shadow-[0_20px_50px_-10px_rgba(0,0,0,.5)]"
      style={{ animation: 'slidein .3s cubic-bezier(.2,.7,.2,1) both' }}
      role="status"
    >
      <span className="size-2 shrink-0 rounded-full bg-sun" />
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 rounded-full p-1 text-cream/80 hover:bg-cream/10"
        aria-label="Fechar"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
