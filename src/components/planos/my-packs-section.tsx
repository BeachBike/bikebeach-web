import { useState } from 'react';
import { useMe, type CreditPack } from '@/api/me';
import {
  useRemovePackCoOwner,
} from '@/api/me';
import { ConfirmModal } from '@/components/common';
import { PackShareModal } from '@/components/common/pack-share-modal';
import { firstName } from '@/lib/format';

interface Props {
  packs: CreditPack[];
}

/// Authenticated wallet section on /planos. Lists the user's active packs
/// (and shared packs they were added to) and exposes the transfer / share
/// CTAs that an admin enabled per offer.
export function MyPacksSection({ packs }: Props) {
  const meQ = useMe();
  const removeCoOwnerMut = useRemovePackCoOwner();
  const [active, setActive] = useState<{
    pack: CreditPack;
    mode: 'transfer' | 'share';
  } | null>(null);
  // ConfirmModal payload for "stop sharing with X". Holds the (packId,
  // userId, name) triple so the modal can render a friendly confirmation
  // instead of a native browser alert.
  const [removeTarget, setRemoveTarget] = useState<{
    packId: string;
    coOwnerUserId: string;
    coOwnerName: string;
  } | null>(null);

  const myUserId = meQ.data?.id;
  const visible = packs.filter(
    (p) => p.remainingCredits > 0 || (p.coOwners && p.coOwners.length > 0),
  );
  if (visible.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2
          className="display-tight"
          style={{ fontSize: 'clamp(28px,3.5vw,40px)', lineHeight: 1 }}
        >
          meus pacotes
        </h2>
        <p className="text-sm text-ink-2">
          Transfira ou compartilhe créditos com amigos quando o pacote
          permitir.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((p) => {
          const isOwner = !!myUserId && p.userId === myUserId;
          const isCoOwnerOnly = !isOwner;
          const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;
          const expiryLabel = expiresAt
            ? expiresAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'sem expiração';
          const totalConsumed = Math.max(
            0,
            p.totalCredits - p.remainingCredits,
          );

          return (
            <article
              key={p.id}
              className="rounded-2xl border border-sand bg-cream p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="display-tight"
                    style={{ fontSize: 26, lineHeight: 1 }}
                  >
                    {p.remainingCredits} crédito
                    {p.remainingCredits === 1 ? '' : 's'}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-2">
                    de {p.totalCredits} · vence em {expiryLabel}
                  </div>
                </div>
                <SourceChip source={p.source} />
              </div>

              {/* Co-owners (when shared). Always shown so co-owners see
                  who else is on the pool. The owner gets a full-width
                  "remover" button per friend instead of a tiny × glyph. */}
              {p.coOwners && p.coOwners.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl bg-cream-2 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                    compartilhado com ({p.coOwners.length}/{p.maxSharedUsers})
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {p.coOwners.map((c) => (
                      <li
                        key={c.user.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2"
                      >
                        <span className="flex flex-col">
                          <span className="text-[13px] font-semibold text-ink">
                            {c.user.name}
                          </span>
                          <span className="text-[11px] text-ink-3">
                            consome do mesmo saldo
                          </span>
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveTarget({
                                packId: p.id,
                                coOwnerUserId: c.user.id,
                                coOwnerName: c.user.name,
                              })
                            }
                            className="shrink-0 rounded-full border-[1.5px] border-clay-d px-3 py-1.5 text-[11px] font-bold text-clay-d transition-colors hover:bg-clay-d hover:text-cream"
                          >
                            remover
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isCoOwnerOnly ? (
                <p className="mt-4 text-[12px] text-ink-2">
                  Você foi adicionada como co-dona. Use os créditos
                  normalmente — só o dono pode transferir ou adicionar mais
                  amigos.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.isTransferable && p.remainingCredits > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setActive({ pack: p, mode: 'transfer' })
                      }
                      className="rounded-full bg-sea px-3 py-1.5 text-[12px] font-bold text-cream transition-opacity hover:opacity-90"
                    >
                      transferir pra amigo →
                    </button>
                  )}
                  {p.maxSharedUsers > 0 &&
                    (p.coOwners?.length ?? 0) < p.maxSharedUsers && (
                      <button
                        type="button"
                        onClick={() =>
                          setActive({ pack: p, mode: 'share' })
                        }
                        className="rounded-full bg-sun px-3 py-1.5 text-[12px] font-bold text-ink transition-opacity hover:opacity-90"
                      >
                        compartilhar com amigos →
                      </button>
                    )}
                  {!p.isTransferable && p.maxSharedUsers === 0 && (
                    <span className="text-[12px] text-ink-3">
                      pacote individual · sem opção de transferir ou
                      compartilhar
                    </span>
                  )}
                </div>
              )}
              {totalConsumed > 0 && (
                <div className="mt-3 text-[11px] text-ink-3">
                  já usou {totalConsumed} crédito{totalConsumed === 1 ? '' : 's'}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {active && (
        <PackShareModal
          pack={active.pack}
          mode={active.mode}
          onClose={() => setActive(null)}
        />
      )}

      <ConfirmModal
        open={!!removeTarget}
        title={
          removeTarget
            ? `Parar de compartilhar com ${firstName(removeTarget.coOwnerName)}?`
            : ''
        }
        description="A pessoa não vai mais poder usar créditos desse pacote. Você pode adicionar de novo depois se quiser."
        confirmLabel="parar de compartilhar"
        cancelLabel="cancelar"
        confirmTone="clay"
        loading={removeCoOwnerMut.isPending}
        onClose={() => {
          if (!removeCoOwnerMut.isPending) setRemoveTarget(null);
        }}
        onConfirm={() => {
          if (!removeTarget) return;
          removeCoOwnerMut.mutate(
            {
              packId: removeTarget.packId,
              coOwnerUserId: removeTarget.coOwnerUserId,
            },
            {
              onSettled: () => setRemoveTarget(null),
            },
          );
        }}
      />
    </section>
  );
}

function SourceChip({ source }: { source: CreditPack['source'] }) {
  const labels: Record<CreditPack['source'], { label: string; bg: string; fg: string }> = {
    PURCHASE_PACK: { label: 'comprado', bg: 'var(--color-cream-2)', fg: 'var(--color-ink)' },
    SUBSCRIPTION_CYCLE: {
      label: 'mensal',
      bg: 'var(--color-clay)',
      fg: 'var(--color-cream)',
    },
    ADMIN_GRANT: { label: 'cortesia', bg: 'var(--color-sun)', fg: 'var(--color-ink)' },
    REFUND: { label: 'devolução', bg: 'var(--color-sand)', fg: 'var(--color-ink)' },
    TRANSFER: { label: 'recebido', bg: 'var(--color-sea)', fg: 'var(--color-cream)' },
  };
  const t = labels[source];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: t.bg, color: t.fg }}
    >
      {t.label}
    </span>
  );
}
