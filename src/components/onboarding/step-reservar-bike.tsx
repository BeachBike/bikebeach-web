/// Step 1 — visual: the 4×8 bike map drops in bike by bike, then a single
/// "chosen" bike pulses with a ring. Replays on mount (parent uses `key`).
///
/// Spatial layout matches the production picker exactly:
///   ocean on top  →  palco/instrutor right below  →  bikes facing palco.
/// The instructor's back is to the ocean and faces the bikes; participants
/// pedal towards the palco (and the ocean view beyond it).
///
/// Why this is the first step: picking a SPECIFIC bike is the unique
/// mental model of bikebeach vs every other studio app. Users won't think
/// to do it unless we show them.
export function StepReservarBike() {
  const ROWS = 4;
  const COLS = 8;
  const CHOSEN_ROW = 1; // 0-indexed (second row from the top — close to palco)
  const CHOSEN_COL = 4;
  const TOTAL = ROWS * COLS;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          escolha sua bike.
        </div>
        <p className="mt-2 max-w-[340px] text-sm text-ink-2">
          Não é só marcar a aula — você escolhe <b>a bike específica</b> que
          quer. Mapa real da arena, com o oceano lá no fundo.
        </p>
      </div>

      <div
        className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border border-sand bg-cream-2 p-3.5"
        aria-hidden
      >
        {/* Oceano — sempre no fundo da arena. Os participantes pedalam
            olhando para o palco, e o oceano fica além dele. */}
        <div
          className="mb-2 rounded-md py-1 text-center text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: 'linear-gradient(180deg, #b8e2dc 0%, #6fc0b1 100%)',
            color: 'var(--color-ink)',
          }}
        >
          ~ oceano ~
        </div>

        {/* Palco / instrutor — fica logo abaixo do oceano. O instrutor está
            de costas para o mar, de frente para os participantes (as bikes
            abaixo). Mesmo posicionamento do mapa de bikes em produção. */}
        <div
          className="mb-2 rounded-md py-1 text-center text-[10px] font-bold uppercase tracking-widest text-cream"
          style={{ background: 'var(--color-ink)' }}
        >
          ▼ palco · instrutor ▼
        </div>

        {/* 4×8 grid de bikes — todas voltadas para o palco (= para o oceano
            atrás dele). Cada bike "pousa" com um pequeno delay em onda. */}
        <div
          className="relative grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: TOTAL }, (_, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const isChosen = row === CHOSEN_ROW && col === CHOSEN_COL;
            const delay = (row * COLS + col) * 35;
            return (
              <div
                key={i}
                className={
                  'relative aspect-square rounded-md text-[9px] font-bold ' +
                  (isChosen
                    ? 'bg-clay text-cream'
                    : 'bg-cream text-ink-2 opacity-70')
                }
                style={{
                  animation:
                    'tour-bike-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
                  animationDelay: `${delay}ms`,
                  ...(isChosen
                    ? {
                        animationName: 'tour-bike-pop, tour-bike-chosen',
                        animationDuration: '0.45s, 1.8s',
                        animationDelay: `${delay}ms, ${delay + 600}ms`,
                        animationIterationCount: '1, infinite',
                        animationFillMode: 'both, both',
                        animationTimingFunction:
                          'cubic-bezier(0.34,1.56,0.64,1), ease-in-out',
                      }
                    : {}),
                }}
              >
                <div className="grid h-full place-items-center">
                  {row * COLS + col + 1}
                </div>
                {/* "Toque" — ring que pulsa em volta da bike escolhida.
                    Substitui um emoji de dedo por uma onda concêntrica que
                    transmite o gesto sem precisar de figura literal. */}
                {isChosen && (
                  <span
                    className="pointer-events-none absolute inset-[-6px] rounded-md border-2 border-clay"
                    style={{
                      animation:
                        'tour-tap 1.8s cubic-bezier(0.4,0,0.2,1) infinite',
                      animationDelay: `${delay + 800}ms`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[12px] text-ink-2">
        A vista que você quer — colado no palco, fundão, perto da amiga.
        Você decide.
      </p>
    </div>
  );
}
