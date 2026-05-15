/// Step 3 — waitlist queue. Four avatars stacked vertically; on each cycle
/// the head leaves (fades right), everyone shifts up, and the user (with a
/// "VOCÊ" label) reaches the top — a bike pops in next to them. Loops.
///
/// Why: users skip waitlist because they don't trust auto-promotion. This
/// shows the system moves on its own; their credit reserves a slot
/// upfront and morphs into the bike when it opens.
const QUEUE = [
  { id: 'a', label: 'M', tone: 'bg-sand' },
  { id: 'b', label: 'R', tone: 'bg-sun/50' },
  { id: 'c', label: 'L', tone: 'bg-sea/30' },
  { id: 'you', label: 'VC', tone: 'bg-clay', isYou: true },
];

export function StepFila() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          aula cheia? entra na fila.
        </div>
        <p className="mt-2 max-w-[340px] text-sm text-ink-2">
          O sistema te promove <b>sozinho</b> quando vaga abrir. Você não
          precisa ficar dando F5.
        </p>
      </div>

      <div className="relative h-[280px] w-full max-w-[280px] overflow-hidden rounded-[18px] border border-sand bg-cream-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-clay">
            lista de espera
          </span>
          <span className="font-mono text-[10px] text-ink-2">aula 19h</span>
        </div>

        <div className="relative h-[200px]">
          {QUEUE.map((p, i) => (
            <div
              key={p.id}
              className="absolute left-0 right-0 flex items-center gap-3"
              style={{
                top: `${i * 54}px`,
                animation:
                  i === 0
                    ? 'tour-queue-leave 5s ease-in-out infinite'
                    : 'tour-queue-shift 5s ease-in-out infinite',
              }}
            >
              <div
                className={
                  'grid h-11 w-11 place-items-center rounded-full text-sm font-bold ring-2 ring-cream ' +
                  p.tone +
                  (p.isYou ? ' text-cream' : ' text-ink')
                }
              >
                {p.label}
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-2">
                  {p.isYou ? 'você' : `posição ${i + 1}`}
                </div>
                <div className="font-mono text-[10px] text-ink-2 opacity-70">
                  esperando vaga
                </div>
              </div>
              {/* When the user is promoted, a "VAGOU" pill pops in next to
                  them. Only renders for the user row; appears in the second
                  half of the loop via the `tour-promoted-pop` keyframe. */}
              {p.isYou && (
                <div
                  className="grid h-11 place-items-center rounded-lg bg-sea px-3 text-[10px] font-bold uppercase tracking-widest text-cream"
                  style={{
                    animation: 'tour-promoted-pop 5s ease-in-out infinite',
                  }}
                >
                  vagou
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[12px] text-ink-2">
        Quando você sobe, ganha <b>2h de cancelamento livre</b> mesmo que a
        aula seja em &lt;8h.
      </p>
    </div>
  );
}
