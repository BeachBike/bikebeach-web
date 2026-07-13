/// Step 1 — the visual bike map. Bikes drop in one by one, then a single
/// "chosen" bike pulses with a ring. Replays on mount (parent uses `key`).
///
/// Spatial layout mirrors the production picker (`components/reservar/
/// step-bike.tsx`): ocean on top → the palco card (rounded, tinted, with the
/// instructor's round portrait) → bikes on a wood deck facing the palco.
/// Updated 2026-07 so the tour's little arena matches the real one the user
/// sees when reserving (the old flat "▼ palco ▼" bar looked nothing like it).
///
/// Why this is the first step: picking a SPECIFIC bike is the one mental
/// model unique to bikebeach. New users won't think to do it unless shown.
///
/// Accessibility: plain wording, and the arena art is `aria-hidden` — the
/// instruction is fully carried by the text.
export function StepReservarBike() {
  const ROWS = 4;
  const COLS = 8;
  const CHOSEN_ROW = 1; // 0-indexed (second row from the palco)
  const CHOSEN_COL = 4;
  const TOTAL = ROWS * COLS;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          você escolhe a bike.
        </div>
        <p className="mt-2 max-w-[340px] text-[15px] leading-snug text-ink-2">
          Aqui não é chegar e sentar em qualquer uma. Você toca no mapa e marca
          a bike que quer, de frente pro mar, no fundão ou do lado da amiga(o).
        </p>
      </div>

      <div
        className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border border-sand bg-cream-2 p-3.5"
        aria-hidden
      >
        {/* Mar — sempre no topo da arena. */}
        <div
          className="mb-2.5 rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: 'linear-gradient(180deg, #b8e2dc 0%, #6fc0b1 100%)',
            color: 'var(--color-ink)',
          }}
        >
          ~ mar ~
        </div>

        {/* Palco — card arredondado e colorido com o retrato redondo do
            instrutor, igual ao mapa de produção. O instrutor fica de frente
            pras bikes (de costas pro mar). */}
        <div className="relative mb-4">
          <div
            className="relative flex items-center gap-3 overflow-hidden px-3.5 py-2.5"
            style={{
              background: 'var(--color-clay)',
              color: 'var(--color-cream)',
              borderRadius: '16px 16px 20px 20px',
              boxShadow: '0 12px 26px -14px rgba(216,93,52,.7)',
            }}
          >
            {/* retrato do instrutor */}
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]"
              style={{
                background: 'var(--color-cream)',
                color: 'var(--color-clay)',
                boxShadow: '0 6px 16px -8px rgba(34,28,22,.5)',
              }}
            >
              ♪
            </span>
            <div className="leading-tight">
              <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                palco
              </div>
              <div className="text-[13px] font-bold lowercase">o instrutor</div>
            </div>
          </div>
          {/* facho de luz do palco descendo sobre as bikes */}
          <div
            className="absolute left-1/2 top-full h-4 w-[80%] -translate-x-1/2"
            style={{
              background:
                'linear-gradient(180deg, rgba(216,93,52,.35), transparent)',
              clipPath: 'polygon(35% 0, 65% 0, 100% 100%, 0 100%)',
            }}
          />
        </div>

        {/* Deck de madeira com as bikes — todas voltadas pro palco. Cada bike
            "pousa" em onda. */}
        <div
          className="relative grid gap-1.5 rounded-xl p-2.5"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            background:
              'repeating-linear-gradient(135deg, #e3d4b3 0 12px, #d4c098 12px 24px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)',
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
                    : 'bg-cream text-ink-2')
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

      <p className="max-w-[320px] text-center text-[13px] leading-snug text-ink-2">
        Toque numa bike <b>livre</b> pra reservar. As ocupadas já aparecem
        marcadas no mapa.
      </p>
    </div>
  );
}
