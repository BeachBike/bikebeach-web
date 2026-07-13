/// Step 4 — credits. Side-by-side cards illustrate the two models:
/// PACOTE = chips that expire on a timer (30/60/90/120d by size) and
/// ASSINATURA = chips that zero out at end of cycle. The pack timer bar
/// fills steadily; the subscription card "blinks reset" at the loop end.
///
/// Why: users mix the two mental models and get burned when subscription
/// credits don't accumulate, or when a pack expires.
const PACK_CHIPS = 5;
const SUB_CHIPS = 8;

export function StepCreditos() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          seus créditos têm prazo.
        </div>
        <p className="mt-2 max-w-[340px] text-[15px] leading-snug text-ink-2">
          Comprou um <b>pacote</b>? Ele vale de 30 a 120 dias, quanto maior,
          mais tempo. É <b>mensalista</b>? Os créditos do mês zeram quando o mês
          vira; não juntam pro próximo.
        </p>
      </div>

      <div className="grid w-full max-w-[320px] grid-cols-2 gap-3">
        {/* Pacote */}
        <div className="rounded-[14px] border border-sand bg-cream-2 p-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-clay">
            pacote
          </div>
          <div className="display-tight mt-1 text-[18px] leading-[1]">
            5 aulas
          </div>
          <div className="my-3 flex flex-wrap gap-1">
            {Array.from({ length: PACK_CHIPS }, (_, i) => (
              <span
                key={i}
                className="h-5 w-5 rounded-full bg-clay text-[8px] text-cream"
                style={{
                  animation:
                    'tour-credit-float 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full bg-clay-d"
              style={{
                animation: 'tour-credit-bar-fill 5s linear infinite',
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[9px] text-ink-2">
            <span>compra</span>
            <span>60 dias →</span>
          </div>
        </div>

        {/* Assinatura */}
        <div
          className="rounded-[14px] border border-sand bg-cream-2 p-3"
          style={{
            animation: 'tour-cycle-reset 5s ease-in-out infinite',
          }}
        >
          <div className="text-[9px] font-bold uppercase tracking-widest text-sea-d">
            assinatura
          </div>
          <div className="display-tight mt-1 text-[18px] leading-[1]">
            8 / mês
          </div>
          <div className="my-3 flex flex-wrap gap-1">
            {Array.from({ length: SUB_CHIPS }, (_, i) => (
              <span
                key={i}
                className="h-5 w-5 rounded-full bg-sea text-[8px] text-cream"
                style={{
                  animation:
                    'tour-credit-float 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div className="h-full w-full bg-sea-d" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[9px] text-ink-2">
            <span>mês 1</span>
            <span>reseta →</span>
          </div>
        </div>
      </div>

      <p className="max-w-[320px] text-center text-[13px] leading-snug text-ink-2">
        Você vê o prazo de cada crédito no painel, na aba <b>meu plano</b>.
      </p>
    </div>
  );
}
