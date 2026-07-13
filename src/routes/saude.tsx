import { useState } from 'react';
import { AxiosError } from 'axios';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import {
  useAcceptLiability,
  useHealthGateStatus,
  useSubmitParq,
} from '@/api/health-gate';
import { Logo } from '@/components/brand/logo';
import { LiabilityCard } from '@/components/saude/liability-card';
import { ParqForm, type ParqAnswers } from '@/components/saude/parq-form';
import { useAuthStore } from '@/stores/auth';

/// Health-gate page. Two cards stacked:
/// 1. Liability waiver — re-accepted monthly
/// 2. PAR-Q questionnaire — re-accepted quarterly, pre-filled from latest
///
/// `?next=…` lets the reservar flow bounce here on a 403 and come back.
export function SaudeRoute() {
  const session = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const navigate = useNavigate();

  const statusQ = useHealthGateStatus();
  const liabilityM = useAcceptLiability();
  const parqM = useSubmitParq();

  const [liabilityError, setLiabilityError] = useState<string | null>(null);
  const [parqError, setParqError] = useState<string | null>(null);

  if (!session) return <Navigate to="/login" replace />;

  const status = statusQ.data;
  const allOk = !!status?.ok;

  const onAcceptLiability = () => {
    setLiabilityError(null);
    liabilityM.mutate(undefined, {
      onError: (err) => setLiabilityError(extractApiMessage(err)),
    });
  };

  const onSubmitParq = (answers: ParqAnswers) => {
    setParqError(null);
    parqM.mutate(answers as unknown as Record<string, unknown>, {
      onError: (err) => setParqError(extractApiMessage(err)),
    });
  };

  return (
    <div className="min-h-svh bg-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
          >
            ← painel
          </Link>
        </div>
      </header>

      <main
        className={`mx-auto max-w-[920px] px-6 pt-8 ${allOk ? 'pb-40' : 'pb-20'}`}
      >
        <div className="text-xs font-bold uppercase tracking-widest text-clay">
          saúde & responsabilidade
        </div>
        <h1
          className="display-tight mt-3"
          style={{ fontSize: 'clamp(28px,6vw,72px)', lineHeight: 0.92 }}
        >
          antes de pedalar,
          <br />
          <span className="font-normal italic text-clay">
            duas confirmações.
          </span>
        </h1>
        <p className="mt-4 max-w-[620px] text-[15px] text-ink-2">
          A primeira é mensal e leva 3 segundos. A segunda é trimestral —
          se você já respondeu antes, suas respostas vêm preenchidas e você só
          edita o que mudou.
        </p>

        {statusQ.isLoading && (
          <div className="mt-10 rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
            carregando…
          </div>
        )}

        {status && (
          <div className="mt-8 flex flex-col gap-5">
            {/* Keyed on acceptedAt so a fresh submission re-mounts the card,
                collapsing it back to the compact summary (2.2). */}
            <LiabilityCard
              key={`liab-${status.liability.acceptedAt ?? 'none'}`}
              valid={status.liability.valid}
              acceptedAt={status.liability.acceptedAt}
              expiresAt={status.liability.expiresAt}
              isSubmitting={liabilityM.isPending}
              errorMessage={liabilityError}
              onAccept={onAcceptLiability}
            />

            <ParqForm
              key={`parq-${status.parq.acceptedAt ?? 'none'}`}
              valid={status.parq.valid}
              acceptedAt={status.parq.acceptedAt}
              initialAnswers={status.parq.latestAnswers}
              isSubmitting={parqM.isPending}
              errorMessage={parqError}
              onSubmit={onSubmitParq}
            />
          </div>
        )}
      </main>

      {/* Sticky success bar — once everything's in order, the CTA to reserve
          is pinned to the bottom of the screen so it's always reachable with
          the thumb on mobile, instead of stranded at the top (2.1). */}
      {allOk && <StickyDoneBar next={next} onContinue={() => navigate(next)} />}
    </div>
  );
}

function StickyDoneBar({
  next,
  onContinue,
}: {
  next: string;
  onContinue: () => void;
}) {
  const goesToReserve = next === '/dashboard';
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sand bg-cream/95 backdrop-blur-md"
      style={{ animation: 'fadein .3s cubic-bezier(.2,.7,.2,1) both' }}
    >
      <div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-between gap-3 px-6 py-3.5 pb-[max(env(safe-area-inset-bottom),14px)]">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px] font-bold text-cream"
            style={{ background: 'var(--color-success)' }}
          >
            ✓
          </span>
          <div>
            <div className="text-[15px] font-bold text-ink">tudo certo!</div>
            <div className="text-[13px] text-ink-2">
              você já pode reservar sua bike.
            </div>
          </div>
        </div>
        {goesToReserve ? (
          <Link
            to="/reservar"
            className="flex-1 rounded-full bg-clay px-6 py-3.5 text-center text-[15px] font-semibold text-cream shadow-[0_14px_32px_-14px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 sm:flex-none"
          >
            reservar minha bike →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-full bg-clay px-6 py-3.5 text-center text-[15px] font-semibold text-cream shadow-[0_14px_32px_-14px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 sm:flex-none"
          >
            continuar →
          </button>
        )}
      </div>
    </div>
  );
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data!.message!.join(' · ');
    if (typeof data?.message === 'string') return data!.message!;
  }
  return 'Algo deu errado. Tenta de novo em alguns segundos.';
}
