import { useNavigate } from 'react-router';
import { useHealthGateStatus } from '@/api/health-gate';

interface Props {
  /// Path to bounce back to after the user finishes the health gate.
  /// Defaults to the current location, which is what most callers want.
  next?: string;
  /// `full` = card style with title + pendentes + CTA (dashboard, reservar).
  /// `compact` = single-line topbar strip — reserved for future use.
  variant?: 'full' | 'compact';
  className?: string;
}

/// Reusable health-gate reminder. Renders nothing when both liability and
/// PAR-Q are valid, or while the status is still loading. Click goes to
/// `/saude?next=…`.
export function HealthGateBanner({
  next,
  variant = 'full',
  className,
}: Props) {
  const navigate = useNavigate();
  const gateQ = useHealthGateStatus();

  if (!gateQ.data || gateQ.data.ok) return null;

  const pendentes: string[] = [];
  if (!gateQ.data.liability.valid)
    pendentes.push('termo de responsabilidade');
  if (!gateQ.data.parq.valid) pendentes.push('par-q de saúde');

  const goResolve = () => {
    const back = next ?? `${location.pathname}${location.search}`;
    navigate(`/saude?next=${encodeURIComponent(back)}`);
  };

  if (variant === 'compact') {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-cream ${className ?? ''}`}
      >
        <div className="flex items-center gap-3">
          <span
            className="bb-pulsedot inline-block size-2 flex-shrink-0 rounded-full bg-clay"
            aria-hidden
          />
          <span className="text-[13px] font-medium">
            falta responder{' '}
            <b className="text-sun">{pendentes.join(' · ')}</b> antes da
            próxima reserva.
          </span>
        </div>
        <button
          type="button"
          onClick={goResolve}
          className="text-[13px] font-bold text-sun hover:underline"
        >
          resolver →
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-[1.5px] border-clay bg-cream-2 px-6 py-5 ${className ?? ''}`}
    >
      <div
        className="pointer-events-none absolute size-[120px] rounded-full bg-clay/10"
        style={{ right: -30, top: -30 }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex max-w-[560px] items-start gap-4">
          <span
            className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-clay text-cream"
            aria-hidden
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
              antes de pedalar
            </div>
            <div
              className="display-tight mt-1"
              style={{ fontSize: 22, lineHeight: 1.1 }}
            >
              {pendentes.length === 2
                ? 'duas confirmações pendentes'
                : 'uma confirmação pendente'}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendentes.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-2 rounded-full border border-sand bg-cream px-2.5 py-1 text-[12px] font-semibold"
                >
                  <span
                    className="bb-pulsedot inline-block size-1.5 rounded-full bg-clay"
                    aria-hidden
                  />
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-ink-3">
              Leva menos de um minuto. Você pode navegar normal — só não dá
              pra confirmar reserva sem isso.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={goResolve}
          className="whitespace-nowrap rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-transform duration-200 hover:-translate-y-0.5"
        >
          responder agora →
        </button>
      </div>
    </div>
  );
}
