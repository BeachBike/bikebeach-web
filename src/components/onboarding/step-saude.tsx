/// Step 2 — the health gate. A closed "portão" with a padlock sits center;
/// two consent stamps (termo mensal + PAR-Q trimestral) drop in one after
/// the other, and once both land the padlock swings open. Loops.
///
/// Why: the health gate is the first hard block a new user hits — the very
/// first reservation pops a PAR-Q + liability modal. Warning about it here
/// turns a "why am I blocked?" moment into an expected 1-click step.
///
/// Content mirrors the FAQ (`saude-parq` / `saude-bloqueia`) and the
/// canonical rules in CLAUDE.md: termo re-accept monthly, PAR-Q every 3
/// months (pre-filled), existing reservations stay valid.
export function StepSaude() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          libere seu acesso.
        </div>
        <p className="mt-2 max-w-[340px] text-sm text-ink-2">
          Na <b>primeira reserva</b> você confirma dois documentos rápidos,
          depois é só de vez em quando.
        </p>
      </div>

      <div
        className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border border-sand bg-cream-2 p-5"
        aria-hidden
      >
        {/* Portão + cadeado — destrava quando os dois selos pousam. */}
        <div className="flex justify-center">
          <div
            className="relative grid h-[92px] w-[92px] place-items-center rounded-2xl bg-cream"
            style={{ animation: 'tour-gate-unlock 5s ease-in-out infinite' }}
          >
            {/* arco do cadeado — "abre" no fim do ciclo */}
            <span
              className="absolute top-[14px] h-8 w-10 rounded-t-full border-[3px] border-b-0 border-ink"
              style={{
                transformOrigin: 'bottom left',
                animation: 'tour-lock-shackle 5s ease-in-out infinite',
              }}
            />
            {/* corpo do cadeado */}
            <span className="absolute bottom-[16px] grid h-9 w-11 place-items-center rounded-md bg-ink text-cream">
              <span className="text-lg">✓</span>
            </span>
          </div>
        </div>

        {/* Dois selos de consentimento — pousam em sequência. */}
        <div className="mt-5 flex flex-col gap-2">
          <div
            className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5"
            style={{ animation: 'tour-stamp 5s ease-in-out infinite' }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-cream"
              style={{ background: 'var(--color-sea)' }}
            >
              ✓
            </span>
            <span className="flex-1">
              <span className="block text-[12px] font-bold text-ink">
                termo de responsabilidade
              </span>
              <span className="block text-[10px] text-ink-2">
                1 clique · reaceite mensal
              </span>
            </span>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5"
            style={{ animation: 'tour-stamp 5s ease-in-out infinite 0.7s' }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink"
              style={{ background: 'var(--color-sun)' }}
            >
              ✓
            </span>
            <span className="flex-1">
              <span className="block text-[12px] font-bold text-ink">
                PAR-Q · saúde
              </span>
              <span className="block text-[10px] text-ink-2">
                5–7 perguntas · a cada 3 meses, pré-preenchido
              </span>
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-[12px] text-ink-2">
        Venceu? Só as <b>reservas novas</b> ficam bloqueadas até você renovar,
        as que já existem continuam de pé.
      </p>
    </div>
  );
}
