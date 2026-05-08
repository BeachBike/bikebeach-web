import { useEffect, useState, type FormEvent } from 'react';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useDeclineFriendRequest,
  useFriendRequests,
  useFriends,
  useMyFriendCode,
  useRemoveFriend,
  useSendFriendRequest,
  useUpdateVisibility,
} from '@/api/friends';
import { useMe } from '@/api/me';
import { ConfirmModal, FriendBubble } from '@/components/common';
import { firstName } from '@/lib/format';

/// G1 — friends tab. Sections:
///   1. "meu código" — display + copy + regenerar (with ConfirmModal)
///   2. "convites pendentes" — incoming (accept/decline) + outgoing (cancel)
///   3. "adicionar amigo" — input com mask XXXX-XXXX
///   4. "meus amigos" — lista com remover (ConfirmModal)
///   5. "modo invisível" — toggle global
export function AmigosSection() {
  const meQ = useMe();
  const codeQ = useMyFriendCode();
  const friendsQ = useFriends();
  const requestsQ = useFriendRequests();

  const sendMut = useSendFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const declineMut = useDeclineFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const removeMut = useRemoveFriend();
  const visibilityMut = useUpdateVisibility();

  const [codeInput, setCodeInput] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendToast, setSendToast] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sendToast) return;
    const t = setTimeout(() => setSendToast(null), 3500);
    return () => clearTimeout(t);
  }, [sendToast]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    if (!codeQ.data?.code) return;
    try {
      await navigator.clipboard.writeText(codeQ.data.code);
      setCopied(true);
    } catch {
      // No clipboard API — silently noop, the user can still select+copy.
    }
  };

  const onSubmitCode = async (e: FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendToast(null);
    const trimmed = codeInput.trim();
    if (!trimmed) return setSendError('Cola o código do seu amigo.');
    try {
      const res = await sendMut.mutateAsync(trimmed);
      setCodeInput('');
      setSendToast(
        res.autoAccepted
          ? `vocês ja eram! ${firstName(res.fromUser.name)} virou amigo agora.`
          : `convite enviado pra ${firstName(res.toUser.name)}.`,
      );
    } catch (err) {
      setSendError(extractMessage(err) ?? 'Não conseguimos enviar.');
    }
  };

  const visible = meQ.data?.hideReservationsFromFriends === false;

  return (
    <section className="col-span-12 mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Coluna esquerda: meu código + adicionar */}
      <div className="flex flex-col gap-4">
        {/* Meu código */}
        <div className="rounded-[22px] bg-cream-2 p-7">
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            seu código
          </div>
          <div
            className="display-tight mono mt-3 break-all"
            style={{ fontSize: 'clamp(36px, 5vw, 48px)', lineHeight: 1 }}
          >
            {codeQ.isLoading ? '····-····' : (codeQ.data?.code ?? '—')}
          </div>
          <p className="mt-2 text-sm text-ink-2">
            compartilha esse código com quem você quer adicionar de amigo. só
            quem tem o código consegue te encontrar.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={onCopy}
              disabled={!codeQ.data?.code}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              {copied ? 'copiado ✓' : 'copiar código'}
            </button>
          </div>
        </div>

        {/* Adicionar amigo */}
        <div className="rounded-[22px] border border-sand bg-cream p-6">
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            adicionar amigo
          </div>
          <form onSubmit={onSubmitCode} className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              value={codeInput}
              onChange={(e) =>
                setCodeInput(formatCodeInput(e.target.value))
              }
              placeholder="XXXX-XXXX"
              maxLength={9}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border-[1.5px] border-sand bg-cream px-4 py-3 font-mono text-lg uppercase tracking-widest focus:border-ink focus:outline-none"
            />
            {sendError && (
              <div className="rounded-lg bg-clay-d/10 px-4 py-2.5 text-sm text-clay-d">
                {sendError}
              </div>
            )}
            {sendToast && (
              <div
                className="rounded-lg bg-sea/15 px-4 py-2.5 text-sm font-semibold text-sea-d"
                style={{ color: 'var(--color-sea)' }}
              >
                {sendToast}
              </div>
            )}
            <button
              type="submit"
              disabled={sendMut.isPending}
              className="self-start rounded-full bg-clay px-5 py-3 text-sm font-semibold text-cream disabled:opacity-60"
            >
              {sendMut.isPending ? 'enviando...' : 'enviar convite'}
            </button>
          </form>
        </div>

        {/* Privacidade */}
        <div className="rounded-[22px] border border-sand bg-cream p-6">
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            privacidade
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={meQ.data?.hideReservationsFromFriends ?? false}
              onChange={(e) =>
                visibilityMut.mutate(e.target.checked)
              }
              className="mt-1 size-5 cursor-pointer accent-clay"
            />
            <span>
              <span className="block text-[15px] font-semibold text-ink">
                modo invisível
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
                quando ligado, seus amigos não veem em quais aulas você está
                reservada. amizades atuais continuam funcionando — só a
                presença fica oculta.
              </span>
            </span>
          </label>
          <div className="mt-2 text-[12px] text-ink-2">
            agora você está{' '}
            <b className="text-ink">{visible ? 'visível' : 'invisível'}</b>{' '}
            pros amigos.
          </div>
        </div>
      </div>

      {/* Coluna direita: convites + lista */}
      <div className="flex flex-col gap-4">
        {/* Convites */}
        <div className="rounded-[22px] bg-cream-2 p-7">
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            convites pendentes
          </div>
          {requestsQ.isLoading ? (
            <div className="mt-4 text-sm text-ink-2">carregando...</div>
          ) : requestsQ.data &&
            (requestsQ.data.incoming.length > 0 ||
              requestsQ.data.outgoing.length > 0) ? (
            <div className="mt-4 flex flex-col gap-3">
              {requestsQ.data.incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5"
                >
                  <FriendBubble
                    userId={r.fromUser.id}
                    name={r.fromUser.name}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold lowercase">
                      {r.fromUser.name}
                    </div>
                    <div className="text-[11px] text-ink-2">
                      quer ser seu amigo
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => acceptMut.mutate(r.id)}
                      disabled={acceptMut.isPending}
                      className="rounded-full bg-clay px-3 py-1.5 text-xs font-semibold text-cream"
                    >
                      aceitar
                    </button>
                    <button
                      type="button"
                      onClick={() => declineMut.mutate(r.id)}
                      disabled={declineMut.isPending}
                      className="rounded-full border border-sand bg-cream px-3 py-1.5 text-xs font-semibold text-ink-2"
                    >
                      recusar
                    </button>
                  </div>
                </div>
              ))}
              {requestsQ.data.outgoing.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5"
                >
                  <FriendBubble
                    userId={r.toUser.id}
                    name={r.toUser.name}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold lowercase">
                      {r.toUser.name}
                    </div>
                    <div className="text-[11px] text-ink-2">
                      enviado · aguardando resposta
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelMut.mutate(r.id)}
                    disabled={cancelMut.isPending}
                    className="rounded-full border border-sand bg-cream px-3 py-1.5 text-xs font-semibold text-ink-2"
                  >
                    cancelar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-cream px-4 py-6 text-center text-sm text-ink-2">
              nenhum convite agora.
            </div>
          )}
        </div>

        {/* Lista de amigos */}
        <div className="rounded-[22px] bg-cream-2 p-7">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-clay">
              meus amigos
            </div>
            <span className="text-xs text-ink-2">
              {friendsQ.data?.length ?? 0}
            </span>
          </div>
          {friendsQ.isLoading ? (
            <div className="mt-4 text-sm text-ink-2">carregando...</div>
          ) : friendsQ.data && friendsQ.data.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2.5">
              {friendsQ.data.map((f) => (
                <div
                  key={f.userId}
                  className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5"
                >
                  <FriendBubble
                    userId={f.userId}
                    name={f.name}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold lowercase">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-ink-2">
                      {f.hideReservationsFromFriends
                        ? 'modo invisível ligado'
                        : 'visível pros amigos'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRemove({ userId: f.userId, name: f.name })
                    }
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-clay-d hover:bg-cream-2"
                  >
                    remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-cream px-4 py-6 text-center text-sm text-ink-2">
              ainda sem amigos. Compartilha seu código pra começar.
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (!confirmRemove) return;
          removeMut.mutate(confirmRemove.userId, {
            onSettled: () => setConfirmRemove(null),
          });
        }}
        title="remover essa amizade?"
        description={
          confirmRemove ? (
            <>
              <b className="text-ink lowercase">{confirmRemove.name}</b> vai
              sumir da sua lista — e você da dela. Pra voltar, alguém precisa
              mandar um convite novo com o código.
            </>
          ) : null
        }
        confirmLabel="remover"
        cancelLabel="manter"
        confirmTone="clay"
        loading={removeMut.isPending}
      />
    </section>
  );
}

/// Auto-format `XXXXXXXX` → `XXXX-XXXX` while the user types. Strips
/// invalid chars + uppercases.
function formatCodeInput(raw: string): string {
  const stripped = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  if (stripped.length <= 4) return stripped;
  return `${stripped.slice(0, 4)}-${stripped.slice(4)}`;
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
