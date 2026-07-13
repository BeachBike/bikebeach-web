import type { ParticipantHealth } from '@/api/health-gate';
import { formatFullDate } from '@/lib/format';
import { PARQ_QUESTIONS } from './parq-questions';

interface Props {
  data: ParticipantHealth;
  /// Nome do aluno (pro cabeçalho), opcional.
  studentName?: string;
}

/// Read-only PAR-Q + termo de um participante, para o professor da aula e o
/// admin revisarem (LGPD-sensível — só managers da aula). Destaca as
/// respostas "SIM" (pontos de atenção), mostra a observação e as datas de
/// aceite. Usado no roster do professor e na lista de participantes do admin.
export function ParqAnswersView({ data, studentName }: Props) {
  const { parq, liability } = data;
  const responses = readResponses(parq.answers);
  const answered = parq.acceptedAt != null;

  return (
    <div className="flex flex-col gap-4">
      {studentName && (
        <div className="text-[13px] font-bold lowercase text-ink">
          {studentName}
        </div>
      )}

      {/* Resumo de atenção */}
      {parq.flagged ? (
        <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-[13px] leading-snug text-clay-d [border-left:3px_solid_var(--color-clay-d)]">
          <b>
            {parq.flaggedKeys.length} ponto
            {parq.flaggedKeys.length === 1 ? '' : 's'} de atenção
          </b>{' '}
          no PAR-Q — recomende avaliação médica e atenção durante a aula.
        </div>
      ) : answered ? (
        <div className="rounded-xl bg-sea/10 px-4 py-3 text-[13px] text-sea-d">
          Sem pontos de atenção no PAR-Q.
        </div>
      ) : (
        <div className="rounded-xl bg-cream-2 px-4 py-3 text-[13px] text-ink-2">
          Este aluno ainda não respondeu o PAR-Q.
        </div>
      )}

      {/* Respostas pergunta a pergunta */}
      {answered && (
        <ul className="flex list-none flex-col gap-1.5">
          {PARQ_QUESTIONS.map((q, i) => {
            const v = responses[q.key];
            const isFlag = v === q.risk;
            return (
              <li
                key={q.key}
                className="grid grid-cols-[24px_1fr_auto] items-start gap-2.5 rounded-[10px] border px-3 py-2.5"
                style={{
                  borderColor: isFlag
                    ? 'var(--color-clay)'
                    : 'var(--color-sand)',
                  background: isFlag
                    ? 'rgba(216,93,52,.06)'
                    : 'var(--color-cream)',
                }}
              >
                <span className="mono text-[11px] font-bold text-ink-3">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[12.5px] leading-snug text-ink-2">
                  {q.label}
                </span>
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{
                    color: isFlag
                      ? 'var(--color-clay-d)'
                      : 'var(--color-ink-3)',
                  }}
                >
                  {v === 'sim' ? 'sim' : v === 'nao' ? 'não' : '—'}
                  {isFlag ? ' ⚠' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Observação do aluno */}
      {parq.notes && (
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-2">
            observação do aluno
          </div>
          <div className="rounded-[10px] bg-cream-2 px-3.5 py-3 text-[13px] leading-snug text-ink">
            {parq.notes}
          </div>
        </div>
      )}

      {/* Datas de aceite */}
      <div className="flex flex-col gap-1 border-t border-sand pt-3 text-[12px] text-ink-3">
        <div>
          PAR-Q:{' '}
          {parq.acceptedAt ? (
            <>
              respondido em <b>{formatFullDate(parq.acceptedAt)}</b>
              {parq.expiresAt && <> · vence {formatFullDate(parq.expiresAt)}</>}
              {!parq.valid && <> · <span className="text-clay-d">vencido</span></>}
            </>
          ) : (
            '—'
          )}
        </div>
        <div>
          Termo:{' '}
          {liability.acceptedAt ? (
            <>
              aceito em <b>{formatFullDate(liability.acceptedAt)}</b>
              {!liability.valid && (
                <> · <span className="text-clay-d">vencido</span></>
              )}
            </>
          ) : (
            '—'
          )}
        </div>
      </div>
    </div>
  );
}

/// Extrai o mapa `responses` do blob `answers` (tolera formatos antigos).
function readResponses(
  answers: Record<string, unknown> | null,
): Record<string, unknown> {
  if (answers && typeof answers === 'object') {
    const r = (answers as { responses?: unknown }).responses;
    if (r && typeof r === 'object') return r as Record<string, unknown>;
  }
  return {};
}
