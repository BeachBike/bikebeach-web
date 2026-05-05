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
import { formatFullDate } from '@/lib/format';
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

      <main className="mx-auto max-w-[920px] px-6 pb-20 pt-8">
        <div className="text-xs font-bold uppercase tracking-widest text-clay">
          saúde & responsabilidade
        </div>
        <h1
          className="display-tight mt-3"
          style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.92 }}
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
          <>
            {allOk && (
              <SuccessBanner next={next} onContinue={() => navigate(next)} />
            )}

            <div className="mt-8 flex flex-col gap-5">
              <LiabilityCard
                valid={status.liability.valid}
                acceptedAt={status.liability.acceptedAt}
                expiresAt={status.liability.expiresAt}
                isSubmitting={liabilityM.isPending}
                errorMessage={liabilityError}
                onAccept={onAcceptLiability}
              />

              <section className="rounded-[20px] border-[1.5px] border-sand bg-cream p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-clay">
                      par-q · screening trimestral
                    </div>
                    <h2
                      className="display-tight mt-1.5"
                      style={{ fontSize: 28, lineHeight: 1.05 }}
                    >
                      sete perguntas, 30 segundos
                    </h2>
                  </div>
                  <ParqStatus
                    valid={status.parq.valid}
                    acceptedAt={status.parq.acceptedAt}
                  />
                </div>
                <p className="mt-3 text-[14px] text-ink-2">
                  São perguntas padrão para liberar atividade física segura. Se
                  qualquer resposta indicar atenção, recomendamos avaliação
                  médica antes da primeira aula.
                  {status.parq.acceptedAt && (
                    <>
                      {' '}
                      Última submissão em{' '}
                      <b>{formatFullDate(status.parq.acceptedAt)}</b>.
                    </>
                  )}
                </p>

                <div className="mt-5">
                  <ParqForm
                    initialAnswers={status.parq.latestAnswers}
                    isSubmitting={parqM.isPending}
                    errorMessage={parqError}
                    onSubmit={onSubmitParq}
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SuccessBanner({
  next,
  onContinue,
}: {
  next: string;
  onContinue: () => void;
}) {
  return (
    <div
      className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-6 py-4 text-cream"
      style={{ animation: 'fadein .25s ease both' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold"
          style={{ background: 'var(--color-success)' }}
        >
          ✓
        </span>
        <div>
          <div className="text-[13px] font-semibold">tudo em dia</div>
          <div className="text-[12px] opacity-75">
            você pode reservar bikes normalmente.
          </div>
        </div>
      </div>
      {next !== '/dashboard' ? (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-clay px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
        >
          continuar →
        </button>
      ) : (
        <Link
          to="/reservar"
          className="rounded-full bg-clay px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
        >
          reservar bike →
        </Link>
      )}
    </div>
  );
}

function ParqStatus({
  valid,
  acceptedAt,
}: {
  valid: boolean;
  acceptedAt: string | null;
}) {
  if (valid) {
    return (
      <span
        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: 'var(--color-success)',
          color: 'var(--color-cream)',
        }}
      >
        em dia
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: 'var(--color-clay-d)',
        color: 'var(--color-cream)',
      }}
    >
      {acceptedAt ? 'expirado' : 'pendente'}
    </span>
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
