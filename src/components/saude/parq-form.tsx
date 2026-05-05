import { useEffect, useMemo, useState } from 'react';
import { PARQ_QUESTIONS, type ParqQuestion } from './parq-questions';

export interface ParqAnswers {
  responses: Record<string, 'sim' | 'nao'>;
  notes: string;
}

interface Props {
  initialAnswers: Record<string, unknown> | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (answers: ParqAnswers) => void;
}

function normalizePrev(
  prev: Record<string, unknown> | null,
): ParqAnswers {
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
  const [showError, setShowError] = useState(false);

  // Re-seed when the latest snapshot loads (e.g. after a refetch).
  useEffect(() => {
    setResponses(seed.responses);
    setNotes(seed.notes);
  }, [seed]);

  const allAnswered = PARQ_QUESTIONS.every((q) => !!responses[q.key]);
  const flagged = PARQ_QUESTIONS.filter(
    (q) => responses[q.key] === q.risk,
  );

  const submit = () => {
    if (!allAnswered) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onSubmit({ responses, notes });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {PARQ_QUESTIONS.map((q, i) => (
          <ParqRow
            key={q.key}
            index={i + 1}
            q={q}
            value={responses[q.key]}
            onChange={(v) =>
              setResponses((prev) => ({ ...prev, [q.key]: v }))
            }
          />
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">
          alguma observação que a gente deva saber? (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="ex: lesão antiga no joelho, asma controlada, gestante…"
          className="w-full resize-none rounded-2xl border-[1.5px] border-sand bg-cream px-4 py-3 text-sm transition-colors focus:border-ink focus:outline-none"
        />
      </label>

      {flagged.length > 0 && (
        <div className="rounded-2xl border-[1.5px] border-clay/30 bg-clay/10 px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-wide text-clay-d">
            converse com seu médico antes da aula
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
            Você marcou <b>{flagged.length}</b> resposta
            {flagged.length === 1 ? '' : 's'} que pede atenção. Você pode
            seguir com a reserva, mas recomendamos avaliação médica antes de
            pedalar.
          </p>
        </div>
      )}

      {showError && !allAnswered && (
        <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
          responde todas as perguntas pra continuar.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2.5 rounded-full bg-clay px-7 py-4 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,0.55)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'salvando…' : 'salvar respostas →'}
      </button>
    </div>
  );
}

function ParqRow({
  index,
  q,
  value,
  onChange,
}: {
  index: number;
  q: ParqQuestion;
  value: 'sim' | 'nao' | undefined;
  onChange: (v: 'sim' | 'nao') => void;
}) {
  const flag = value === q.risk;
  return (
    <div
      className="flex items-start gap-4 rounded-2xl border-[1.5px] bg-cream px-5 py-4 transition-colors"
      style={{
        borderColor: flag ? 'var(--color-clay)' : 'var(--color-sand)',
      }}
    >
      <span
        className="mono mt-0.5 text-[13px] font-bold text-ink-2"
        style={{ minWidth: 22 }}
      >
        {String(index).padStart(2, '0')}
      </span>
      <div className="flex-1">
        <p className="text-sm leading-snug">{q.label}</p>
        <div className="mt-3 flex gap-2">
          <Choice
            on={value === 'nao'}
            label="não"
            onSelect={() => onChange('nao')}
          />
          <Choice
            on={value === 'sim'}
            label="sim"
            onSelect={() => onChange('sim')}
          />
        </div>
      </div>
    </div>
  );
}

function Choice({
  on,
  label,
  onSelect,
}: {
  on: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-full border-[1.5px] px-5 py-2 text-sm font-semibold transition-colors"
      style={{
        background: on ? 'var(--color-ink)' : 'transparent',
        color: on ? 'var(--color-cream)' : 'var(--color-ink)',
        borderColor: on ? 'var(--color-ink)' : 'var(--color-sand)',
      }}
    >
      {label}
    </button>
  );
}
