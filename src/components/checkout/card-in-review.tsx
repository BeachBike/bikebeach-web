import type { CreateCardPackResult } from '@/api/me';

interface Props {
  result: CreateCardPackResult;
}

/// Shown when the card charge came back `AWAITING_RISK_ANALYSIS`. The webhook
/// (or the 5-min cron) resolves it to PAID/FAILED later; the parent polls
/// `/payments/:id` and swaps to the success / decline screen accordingly.
export function CardInReview({ result }: Props) {
  const last4 = result.cardLast4 ?? '••••';
  const brand = result.cardBrand ?? 'cartão';
  const total = (result.amountCents / 100)
    .toFixed(2)
    .replace('.', ',');
  return (
    <div className="flex flex-col items-start gap-5 py-4">
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-sun/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-clay-d">
        em análise
      </div>
      <div
        className="display-tight"
        style={{ fontSize: 28, lineHeight: 1.05 }}
      >
        a asaas tá conferindo seu cartão.
      </div>
      <p className="text-sm text-ink-2">
        Cobrança de <b>R$ {total}</b> no <b>{brand.toLowerCase()}</b> ••••{' '}
        {last4} caiu na análise antifraude. Costuma demorar alguns minutos.
        Você pode fechar essa tela — assim que aprovar, o pacote aparece no
        seu painel. Se for recusada, você verá um aviso aqui e nada é
        cobrado.
      </p>
      <div className="flex items-center gap-3 rounded-xl bg-cream-2 px-4 py-3 text-[13px] text-ink-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-clay" />
        aguardando confirmação da asaas…
      </div>
    </div>
  );
}
