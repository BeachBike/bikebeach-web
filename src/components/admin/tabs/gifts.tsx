import { useState } from 'react';
import {
  useAdminGrants,
  useAdminUserSearch,
  useGrantCreditPack,
  type AdminUserResult,
} from '@/api/admin';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import { FormField, TextInput } from '@/components/admin/drawer';

/// Preset gift packs — mirror the standard tiers + their expiry rule
/// (CLAUDE.md: 1→30d, 5→60d, 10→90d, 20→120d).
const PRESETS = [
  { credits: 1, days: 30, label: 'avulsa' },
  { credits: 5, days: 60, label: '5 aulas' },
  { credits: 10, days: 90, label: '10 aulas' },
  { credits: 20, days: 120, label: '20 aulas' },
] as const;

/// Admin "presentes" — give free credits (packages or single classes) to a
/// user for giveaways / partnerships. Reuses `POST /credit-packs/grant`
/// (source ADMIN_GRANT → "cortesia"); the gift lands free in the user's
/// wallet and shows up in finance as grátis.
export function AdminGifts() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUserResult | null>(null);
  const [preset, setPreset] = useState<number>(10); // credits of the picked preset
  const [custom, setCustom] = useState(false);
  const [customCredits, setCustomCredits] = useState('');
  const [customDays, setCustomDays] = useState(''); // '' = never expires
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchQ = useAdminUserSearch(selected ? '' : query);
  const grantsQ = useAdminGrants();
  const grantMut = useGrantCreditPack();

  const activePreset = PRESETS.find((p) => p.credits === preset) ?? PRESETS[2];

  const resolvedCredits = custom
    ? parseInt(customCredits, 10) || 0
    : activePreset.credits;
  const resolvedDays = custom
    ? customDays.trim()
      ? parseInt(customDays, 10) || 0
      : 0 // blank custom days = never expires
    : activePreset.days;

  const canGrant = !!selected && resolvedCredits >= 1 && !grantMut.isPending;

  const onGrant = () => {
    if (!selected) return;
    setError(null);
    setToast(null);
    const credits = resolvedCredits;
    if (credits < 1) return setError('Escolha ao menos 1 crédito.');
    const expiresAt =
      resolvedDays > 0
        ? new Date(Date.now() + resolvedDays * 86_400_000).toISOString()
        : undefined;
    grantMut.mutate(
      {
        userId: selected.id,
        credits,
        expiresAt,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setToast(
            `🎁 ${credits} crédito${credits === 1 ? '' : 's'} enviado${credits === 1 ? '' : 's'} pra ${selected.name.split(' ')[0]}.`,
          );
          // Reset the recipient + note; keep the pack selection for a fast
          // second gift (common in giveaways with multiple winners).
          setSelected(null);
          setQuery('');
          setNote('');
        },
        onError: (err) => setError(extractMessage(err)),
      },
    );
  };

  return (
    <div className="fadein">
      <PageHead
        eyebrow="cortesias"
        title="presentes"
        sub="dê pacotes ou avulsos de graça — sorteios, parcerias, cortesias. Entra no financeiro como grátis."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* ── Dar presente ─────────────────────────────────────── */}
        <Card>
          {/* 1. destinatário */}
          <FormField
            label="1. pra quem"
            hint="busque por nome ou e-mail — filtra a cada tecla."
          >
            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xs border border-sand bg-cream-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold lowercase text-ink">
                    {selected.name}
                  </div>
                  <div className="truncate text-[12px] text-ink-2">
                    {selected.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setQuery('');
                  }}
                  className="shrink-0 text-[13px] font-semibold text-clay"
                >
                  trocar
                </button>
              </div>
            ) : (
              <>
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="nome ou e-mail do cliente"
                  autoComplete="off"
                />
                {query.trim().length >= 1 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xs border border-sand">
                    {searchQ.isLoading ? (
                      <div className="px-4 py-3 text-[13px] text-ink-2">
                        buscando…
                      </div>
                    ) : searchQ.data && searchQ.data.length > 0 ? (
                      searchQ.data.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelected(u)}
                          className="flex w-full flex-col items-start border-b border-sand px-4 py-2.5 text-left last:border-b-0 hover:bg-cream-2"
                        >
                          <span className="text-[13px] font-semibold lowercase text-ink">
                            {u.name}
                          </span>
                          <span className="text-[12px] text-ink-2">
                            {u.email}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-[13px] text-ink-2">
                        ninguém encontrado pra “{query.trim()}”.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </FormField>

          {/* 2. pacote */}
          <div className="mt-5">
            <FormField label="2. o que presentear">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((p) => {
                  const on = !custom && preset === p.credits;
                  return (
                    <button
                      key={p.credits}
                      type="button"
                      onClick={() => {
                        setCustom(false);
                        setPreset(p.credits);
                      }}
                      className="rounded-xs border-[1.5px] px-3 py-3 text-left transition-colors"
                      style={{
                        borderColor: on
                          ? 'var(--color-clay)'
                          : 'var(--color-sand)',
                        background: on ? 'var(--color-clay)' : 'transparent',
                        color: on
                          ? 'var(--color-cream)'
                          : 'var(--color-ink)',
                      }}
                    >
                      <div className="text-[15px] font-bold">
                        {p.credits}
                        <span className="text-[11px] font-semibold">
                          {' '}
                          crédito{p.credits === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ opacity: on ? 0.85 : 0.6 }}
                      >
                        {p.label} · {p.days}d
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCustom((v) => !v)}
                className="mt-2 text-[13px] font-semibold text-clay"
              >
                {custom ? '← usar um pacote padrão' : 'personalizar →'}
              </button>

              {custom && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <FormField label="créditos">
                    <TextInput
                      type="number"
                      min={1}
                      max={1000}
                      value={customCredits}
                      onChange={(e) => setCustomCredits(e.target.value)}
                      placeholder="ex: 3"
                    />
                  </FormField>
                  <FormField label="validade (dias)" hint="vazio = não expira">
                    <TextInput
                      type="number"
                      min={0}
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="ex: 90"
                    />
                  </FormField>
                </div>
              )}
            </FormField>
          </div>

          {/* 3. campanha */}
          <div className="mt-5">
            <FormField
              label="3. campanha (opcional)"
              hint="pra reconciliar depois — aparece no histórico e no financeiro."
            >
              <TextInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ex: sorteio insta jan, parceria loja X"
                maxLength={200}
              />
            </FormField>
          </div>

          {error && (
            <div className="mt-4 rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
              {error}
            </div>
          )}
          {toast && (
            <div className="mt-4 rounded-xs bg-sea/10 px-4 py-3 text-sm font-semibold text-sea-d">
              {toast}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-[13px] text-ink-2">
              {selected ? (
                <>
                  vai enviar <b className="text-ink">{resolvedCredits}</b>{' '}
                  crédito{resolvedCredits === 1 ? '' : 's'} grátis
                  {resolvedDays > 0
                    ? ` · vence em ${resolvedDays}d`
                    : ' · sem validade'}
                </>
              ) : (
                'escolha um cliente pra começar.'
              )}
            </div>
            <Btn tone="clay" onClick={onGrant} disabled={!canGrant}>
              {grantMut.isPending ? 'enviando…' : 'presentear →'}
            </Btn>
          </div>
        </Card>

        {/* ── Últimos presentes ────────────────────────────────── */}
        <Card>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-clay">
            últimos presentes
          </div>
          {grantsQ.isLoading ? (
            <div className="py-6 text-center text-sm text-ink-2">
              carregando…
            </div>
          ) : grantsQ.data && grantsQ.data.length > 0 ? (
            <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto">
              {grantsQ.data.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xs border border-sand bg-cream px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold lowercase text-ink">
                        {g.user.name}
                      </div>
                      <div className="truncate text-[12px] text-ink-2">
                        {g.user.email}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold text-ink">
                      {g.totalCredits} créd.
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-2">
                    <span>{formatDate(g.createdAt)}</span>
                    <span>·</span>
                    <span>restam {g.remainingCredits}</span>
                    {g.note && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-clay">
                          {g.note}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xs border border-dashed border-sand bg-cream-2 px-4 py-8 text-center text-sm text-ink-2">
              Nenhum presente ainda. O primeiro sorteio começa aqui.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function extractMessage(err: unknown): string {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? 'Não foi possível enviar o presente.';
}
