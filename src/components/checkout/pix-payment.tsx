import { useEffect, useState } from 'react';
import type { CreatePixPackResult } from '@/api/me';

interface Props {
  pix: CreatePixPackResult;
  isPaid: boolean;
}

/// Displays the QR + copy-and-paste code returned by the backend after a
/// PIX charge is created. The countdown is informative — actual expiry is
/// enforced by Asaas; we just hide the "expired" hint here.
export function PixPayment({ pix, isPaid }: Props) {
  const expireMs = new Date(pix.pix.expiresAt).getTime();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, expireMs - now);
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  const expired = left === 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.pix.qrCodePayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers — fall back to a manual select prompt
      window.prompt('Copia o código PIX:', pix.pix.qrCodePayload);
    }
  };

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[260px_1fr]">
      {/* QR */}
      <div className="relative aspect-square rounded-[18px] border-[1.5px] border-sand bg-cream p-3.5">
        <img
          src={`data:image/png;base64,${pix.pix.qrCodeImage}`}
          alt="QR code PIX"
          className="h-full w-full rounded-md"
        />
        {/* Centro — selo da marca pra dar identidade */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-[50px] w-[50px] place-items-center rounded-[10px] border-[1.5px] border-ink bg-cream">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" fill="var(--color-clay)" />
              <path
                d="M5 22 Q11 17 16 22 T27 22"
                stroke="var(--color-cream)"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="16" cy="13" r="2.4" fill="var(--color-cream)" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <div
          className="display-tight"
          style={{ fontSize: 32, lineHeight: 1 }}
        >
          aponte sua câmera.
        </div>
        <p className="mt-2 text-sm text-ink-2">
          ou copia o código abaixo. assim que você pagar, o pacote vai pra
          sua conta automaticamente.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-2 px-3.5 py-3">
          <span className="mono max-w-[280px] truncate text-xs opacity-80">
            {pix.pix.qrCodePayload}
          </span>
          <button
            type="button"
            onClick={copy}
            className="whitespace-nowrap rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-cream"
          >
            {copied ? 'copiado ✓' : 'copiar'}
          </button>
        </div>

        <div
          className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-3 text-cream"
          style={{
            background: isPaid ? 'var(--color-success)' : 'var(--color-ink)',
          }}
        >
          {isPaid ? (
            <>
              <span className="text-xl">✓</span>
              <span
                className="display-tight"
                style={{ fontSize: 18 }}
              >
                pagamento confirmado!
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-bold uppercase tracking-wide text-sun">
                {expired ? 'expirado' : 'expira em'}
              </span>
              <span
                className="display-tight"
                style={{
                  fontSize: 24,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {expired ? '00:00' : `${mm}:${ss}`}
              </span>
              <span className="ml-auto flex items-center gap-2 text-[12px] opacity-85">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sun" />
                aguardando pagamento…
              </span>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-ink-2 opacity-80">
          ↳ recebe via api da <b>asaas</b>. Confirmação automática em até 30s
          depois do pagamento. Sem cobrança extra.
        </p>
      </div>
    </div>
  );
}
