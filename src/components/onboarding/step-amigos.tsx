import { useMyFriendCode } from '@/api/friends';

/// Step 6 (last) — the social layer. The user's REAL friend code shows up
/// front (revealed char by char), then a credit "chip" travels from YOU to a
/// friend avatar — the transfer / share gesture — and loops.
///
/// Why real code (not a fake sample): a first-timer who isn't internet-savvy
/// could mistake a made-up "K7B2-9QX4" for their own. Showing their actual
/// code makes "compartilhe esse código" literal and unambiguous — they can
/// even copy it from here.
///
/// Content mirrors `amigos-section.tsx` (code XXXX-XXXX, only who has the
/// code finds you, modo invisível) and `my-packs-section.tsx` (transfer /
/// share depends on the pack's PackOffer flags).
const PLACEHOLDER_CODE = '••••-••••';

export function StepAmigos() {
  const codeQ = useMyFriendCode();
  const code = codeQ.data?.code ?? PLACEHOLDER_CODE;
  const isReal = !!codeQ.data?.code;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <div className="display-tight text-[28px] leading-[1] sm:text-[34px]">
          chama a galera.
        </div>
        <p className="mt-2 max-w-[340px] text-[15px] leading-snug text-ink-2">
          Passe o seu <b>código de amigo</b> pra quem pedala com você, e vocês
          podem até dividir os créditos de um pacote.
        </p>
      </div>

      <div className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border border-sand bg-cream-2 p-5">
        {/* Código de amigo REAL do usuário — revela caractere por caractere. */}
        <div className="rounded-xl bg-cream px-4 py-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-clay">
            este é o seu código
          </div>
          <div
            className="mt-1 font-mono text-[22px] font-bold tracking-widest text-ink"
            aria-label={isReal ? `Seu código de amigo é ${code}` : undefined}
          >
            {code.split('').map((ch, i) => (
              <span
                key={i}
                style={{
                  animation:
                    'tour-code-reveal 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                  animationDelay: `${i * 90}ms`,
                }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-ink-2">
            {isReal
              ? 'só quem tiver ele consegue te achar'
              : 'seu código aparece aqui no painel'}
          </div>
        </div>

        {/* Transferência — chip de crédito viaja de VOCÊ pro amigo. */}
        <div
          className="relative mt-5 flex items-center justify-between px-2"
          aria-hidden
        >
          <Avatar label="você" tone="var(--color-clay)" fg="var(--color-cream)" />

          {/* trilho + chip animado */}
          <div className="relative mx-3 h-8 flex-1">
            <div className="absolute top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full border-t-2 border-dashed border-sand" />
            <span
              className="absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[9px] font-bold text-cream shadow-[0_6px_16px_-6px_rgba(216,93,52,0.7)]"
              style={{
                background: 'var(--color-clay)',
                animation: 'tour-credit-send 3.2s ease-in-out infinite',
              }}
            >
              ●
            </span>
          </div>

          <Avatar label="amigo" tone="var(--color-sea)" fg="var(--color-cream)" />
        </div>
        <div className="mt-2 text-center text-[11px] font-semibold text-ink-2">
          dá pra passar créditos de um pacote pra um amigo
        </div>
      </div>

      <p className="max-w-[320px] text-center text-[13px] leading-snug text-ink-2">
        Não quer que os amigos vejam suas aulas? É só ligar o{' '}
        <b>modo invisível</b> no painel.
      </p>
    </div>
  );
}

function Avatar({
  label,
  tone,
  fg,
}: {
  label: string;
  tone: string;
  fg: string;
}) {
  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[10px] font-bold lowercase ring-2 ring-cream"
      style={{ background: tone, color: fg }}
    >
      {label}
    </span>
  );
}
