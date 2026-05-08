import { useEffect, useMemo, useState } from 'react';
import { formatFullDate } from '@/lib/format';
import { PARQ_QUESTIONS } from './parq-questions';

export interface ParqAnswers {
  responses: Record<string, 'sim' | 'nao'>;
  notes: string;
}

interface Props {
  valid: boolean;
  acceptedAt: string | null;
  initialAnswers: Record<string, unknown> | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (answers: ParqAnswers) => void;
}

const TOTAL = PARQ_QUESTIONS.length;
/// Short labels used in the progress hint and review summary. Keys must
/// match `parq-questions.ts`.
const LABELS: Record<string, string> = {
  cardiac: 'problema de coração',
  chestPainExercise: 'dor no peito · exercício',
  chestPainRest: 'dor no peito · repouso',
  dizziness: 'tontura ou desmaio',
  jointBone: 'problema articular',
  medication: 'medicação contínua',
  otherReason: 'outra razão',
};

function normalizePrev(prev: Record<string, unknown> | null): ParqAnswers {
  const responses: Record<string, 'sim' | 'nao'> = {};
  let notes = '';
  if (prev && typeof prev === 'object') {
    const r = prev.responses as Record<string, unknown> | undefined;
    if (r && typeof r === 'object') {
      for (const q of PARQ_QUESTIONS) {
        const v = r[q.key];
        if (v === 'sim' || v === 'nao') responses[q.key] = v;
      }
    }
    if (typeof prev.notes === 'string') notes = prev.notes;
  }
  return { responses, notes };
}

export function ParqForm({
  valid,
  acceptedAt,
  initialAnswers,
  isSubmitting,
  errorMessage,
  onSubmit,
}: Props) {
  const seed = useMemo(() => normalizePrev(initialAnswers), [initialAnswers]);
  const [responses, setResponses] = useState<Record<string, 'sim' | 'nao'>>(
    seed.responses,
  );
  const [notes, setNotes] = useState(seed.notes);
  /// 0..TOTAL-1 = pergunta n; TOTAL = revisão
  const [step, setStep] = useState(0);
  /// Bumped on every transition so the question/review block re-mounts and
  /// the slidein animation plays again. Cheaper than tracking direction.
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setResponses(seed.responses);
    setNotes(seed.notes);
  }, [seed]);

  const expired = !valid && !!acceptedAt;
  const onReview = step === TOTAL;
  const current = PARQ_QUESTIONS[step];
  const flagged = PARQ_QUESTIONS.filter((q) => responses[q.key] === q.risk);

  const goTo = (next: number) => {
    setStep(next);
    setAnimKey((k) => k + 1);
  };

  const set = (key: string, v: 'sim' | 'nao') => {
    setResponses((prev) => ({ ...prev, [key]: v }));
    // auto-advance with a short delay so the user sees the selection click
    window.setTimeout(() => goTo(Math.min(TOTAL, step + 1)), 260);
  };

  const back = () => goTo(Math.max(0, step - 1));
  const next = () => goTo(Math.min(TOTAL, step + 1));

  const submit = () => {
    onSubmit({ responses, notes });
  };

  return (
    <section className="overflow-hidden rounded-[20px] border-[1.5px] border-sand bg-cream">
      {/* Header */}
      <div className="px-7 pt-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-clay">
              par-q · screening trimestral
            </div>
            <h2
              className="display-tight mt-2"
              style={{ fontSize: 30, lineHeight: 1.05 }}
            >
              sete perguntas, 30 segundos
            </h2>
          </div>
          <StatusPill valid={valid} expired={expired} />
        </div>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">
          São perguntas padrão para liberar atividade física segura. Se
          qualquer resposta indicar atenção, recomendamos avaliação médica
          antes da primeira aula.
          {acceptedAt && (
            <>
              {' '}
              Última submissão em <b>{formatFullDate(acceptedAt)}</b>.
            </>
          )}
        </p>
      </div>

      {/* Progress */}
      <div className="px-7 pt-5">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL + 1 }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background:
                  i < step
                    ? 'var(--color-ink)'
                    : i === step
                      ? 'var(--color-clay)'
                      : 'var(--color-sand)',
              }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <span className="mono">
            {onReview
              ? 'revisão'
              : `pergunta ${String(step + 1).padStart(2, '0')} de ${String(TOTAL).padStart(2, '0')}`}
          </span>
          <span className="truncate pl-3 text-right">
            {onReview ? 'quase lá' : (LABELS[current!.key] ?? '')}
          </span>
        </div>
      </div>

      {/* Body — fixed min-height so the slide animation has somewhere to live */}
      <div
        className="relative px-7 pb-7 pt-8"
        style={{ minHeight: 360 }}
      >
        {!onReview && current && (
          <div
            key={`q-${animKey}`}
            className="flex h-full flex-col"
            style={{
              animation: 'slidein .35s cubic-bezier(.2,.7,.2,1) both',
            }}
          >
            <div className="display-tight mono mb-3 text-[13px] text-clay">
              {String(step + 1).padStart(2, '0')}.
            </div>
            <p
              className="display-tight max-w-[640px] font-medium text-ink"
              style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.2 }}
            >
              {current.label}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <BigChoice
                label="não"
                hint="sigo bem"
                selected={responses[current.key] === 'nao'}
                onClick={() => set(current.key, 'nao')}
              />
              <BigChoice
                label="sim"
                hint="preciso de atenção"
                tone="warn"
                selected={responses[current.key] === 'sim'}
                onClick={() => set(current.key, 'sim')}
              />
            </div>

            <div className="flex-1" />

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
                style={{
                  color:
                    step === 0
                      ? 'var(--color-sand-2)'
                      : 'var(--color-ink-2)',
                }}
              >
                ← voltar
              </button>
              {responses[current.key] && (
                <button
                  type="button"
                  onClick={next}
                  className="px-4 py-2.5 text-[13px] font-semibold text-clay"
                >
                  continuar →
                </button>
              )}
            </div>
          </div>
        )}

        {onReview && (
          <div
            key={`review-${animKey}`}
            className="flex flex-col gap-5"
            style={{
              animation: 'slidein .35s cubic-bezier(.2,.7,.2,1) both',
            }}
          >
            <p
              className="display-tight font-medium"
              style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.2 }}
            >
              {flagged.length === 0
                ? 'Tudo limpo. Quer adicionar alguma observação?'
                : `Você marcou ${flagged.length} ponto${flagged.length === 1 ? '' : 's'} de atenção.`}
            </p>

            {flagged.length > 0 && (
              <div className="rounded-[10px] bg-cream-2 px-4 py-3 text-[13px] leading-snug text-ink-2 [border-left:3px_solid_var(--color-clay)]">
                Você pode seguir com a reserva, mas{' '}
                <b>recomendamos avaliação médica</b> antes da primeira aula.
                Avise a equipe na recepção também — a gente cuida pra você.
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {PARQ_QUESTIONS.map((q, i) => {
                const v = responses[q.key];
                const isFlag = v === q.risk;
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => goTo(i)}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-[10px] border-[1px] px-3.5 py-2.5 text-left transition-colors"
                    style={{
                      borderColor: isFlag
                        ? 'var(--color-clay)'
                        : 'var(--color-sand)',
                      background: isFlag
                        ? 'rgba(216,93,52,.08)'
                        : 'var(--color-cream)',
                    }}
                  >
                    <span className="mono text-[11px] font-bold text-ink-3">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[13px] text-ink-2">
                      {LABELS[q.key]}
                    </span>
                    <span
                      className="text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        color: isFlag
                          ? 'var(--color-clay-d)'
                          : 'var(--color-ink-3)',
                      }}
                    >
                      {v === 'sim' ? 'sim' : v === 'nao' ? 'não' : '—'}{' '}
                      {isFlag ? '⚠' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label
                htmlFor="parq-notes"
                className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-ink-2"
              >
                observação que a gente deva saber?{' '}
                <span className="font-medium normal-case tracking-normal text-ink-3">
                  (opcional)
                </span>
              </label>
              <textarea
                id="parq-notes"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: lesão antiga no joelho, asma controlada, gestante…"
                className="w-full resize-y rounded-[10px] border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm transition-colors focus:border-ink focus:bg-white focus:outline-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
                {errorMessage}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                className="px-4 py-2.5 text-[13px] font-semibold text-ink-2"
              >
                ← rever
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting}
                className="rounded-full bg-clay px-7 py-3.5 text-sm font-semibold text-cream shadow-[0_14px_32px_-14px_rgba(216,93,52,0.6)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'salvando…' : 'salvar respostas →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface BigChoiceProps {
  label: string;
  hint: string;
  tone?: 'warn';
  selected: boolean;
  onClick: () => void;
}

function BigChoice({ label, hint, tone, selected, onClick }: BigChoiceProps) {
  const warn = tone === 'warn';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[96px] flex-1 basis-[200px] flex-col gap-1.5 rounded-2xl border-[2px] px-5 py-4 text-left transition-colors"
      style={{
        borderColor: selected
          ? warn
            ? 'var(--color-clay)'
            : 'var(--color-ink)'
          : 'var(--color-sand)',
        background: selected
          ? warn
            ? 'rgba(216,93,52,.08)'
            : 'var(--color-cream-2)'
          : 'var(--color-cream)',
      }}
    >
      <span
        className="display-tight"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color:
            warn && selected ? 'var(--color-clay)' : 'var(--color-ink)',
        }}
      >
        {label}
      </span>
      <span className="text-[12px] text-ink-3">{hint}</span>
    </button>
  );
}

function StatusPill({
  valid,
  expired,
}: {
  valid: boolean;
  expired: boolean;
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
        background: expired
          ? 'var(--color-clay-d)'
          : 'var(--color-sand-2)',
        color: expired ? 'var(--color-cream)' : 'var(--color-ink)',
      }}
    >
      {expired ? 'expirado' : 'pendente'}
    </span>
  );
}

