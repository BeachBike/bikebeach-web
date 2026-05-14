import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { useFriends } from '@/api/friends';
import {
  useAddPackCoOwners,
  useTransferPackCredits,
  type CreditPack,
} from '@/api/me';
import { InputNumber } from '@/components/common/inputs';

interface Props {
  pack: CreditPack;
  /// 'transfer' = send N credits to a single friend (creates a brand-new
  /// TRANSFER pack on their side). 'share' = add up to N friends as
  /// co-owners of THIS pack (they all consume from the same pool).
  mode: 'transfer' | 'share';
  onClose: () => void;
}

/// Friend-only modal for the two pack-sharing flows. Both gates are
/// admin-controlled per pack offer (snapshotted into CreditPack at
/// purchase time). The component renders the right form based on `mode`.
export function PackShareModal({ pack, mode, onClose }: Props) {
  const friendsQ = useFriends();
  const transferMut = useTransferPackCredits();
  const shareMut = useAddPackCoOwners();
  const [count, setCount] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allFriends = friendsQ.data ?? [];
  // Co-owners already on the pack are filtered out — adding the same friend
  // twice is a no-op server-side, but clearer to hide them.
  const existingCoOwnerIds = new Set(
    pack.coOwners?.map((c) => c.user.id) ?? [],
  );
  const candidates = allFriends.filter(
    (f) => !existingCoOwnerIds.has(f.userId),
  );

  const remainingShareSlots =
    pack.maxSharedUsers - (pack.coOwners?.length ?? 0);

  const handlePick = (id: string) => {
    setError(null);
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : mode === 'transfer'
          ? [id] // single-select for transfer
          : prev.length >= remainingShareSlots
            ? prev // already at the cap
            : [...prev, id],
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (picked.length === 0) {
      return setError('Escolhe pelo menos um amigo.');
    }
    try {
      if (mode === 'transfer') {
        if (count < 1) return setError('Quantidade inválida.');
        if (count > pack.remainingCredits)
          return setError(
            `Você só tem ${pack.remainingCredits} crédito(s) disponíveis.`,
          );
        await transferMut.mutateAsync({
          packId: pack.id,
          toUserId: picked[0]!,
          count,
        });
      } else {
        await shareMut.mutateAsync({
          packId: pack.id,
          friendUserIds: picked,
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as { message?: string | string[] };
        const msg = Array.isArray(data.message)
          ? data.message.join('. ')
          : data.message;
        setError(msg ?? 'Falhou — tenta de novo.');
      } else {
        setError('Falhou — tenta de novo.');
      }
    }
  };

  const title =
    mode === 'transfer'
      ? 'transferir créditos pra um amigo'
      : 'compartilhar pacote com amigos';
  const subtitle =
    mode === 'transfer'
      ? `Você manda ${count} crédito${count === 1 ? '' : 's'} pra um amigo (precisa ter amizade aceita). Cria um pacote novo na carteira dele com a mesma validade.`
      : `Amigos escolhidos passam a consumir do mesmo saldo desse pacote (${pack.remainingCredits} crédito${pack.remainingCredits === 1 ? '' : 's'} restantes). Você pode adicionar até ${remainingShareSlots} pessoa${remainingShareSlots === 1 ? '' : 's'} agora.`;

  const isPending = transferMut.isPending || shareMut.isPending;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6 backdrop-blur-sm"
      style={{ background: 'rgba(34,28,22,.5)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-[460px] overflow-hidden rounded-[24px] bg-cream shadow-[0_40px_80px_rgba(0,0,0,0.4)]"
      >
        <div className="border-b border-sand bg-cream-2 px-7 py-6">
          <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
            {mode === 'transfer' ? 'transferência' : 'compartilhar'}
          </div>
          <div className="display-tight mt-1.5" style={{ fontSize: 26, lineHeight: 1.05 }}>
            {title}
          </div>
          <p className="mt-2 text-[13px] leading-snug text-ink-2">
            {subtitle}
          </p>
        </div>

        <div className="flex max-h-[460px] flex-col gap-3 overflow-y-auto px-7 py-5">
          {mode === 'transfer' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">
                quantos créditos
              </span>
              <div className="w-28">
                <InputNumber
                  value={count}
                  onChange={(v) => setCount(v ?? 1)}
                  min={1}
                  max={pack.remainingCredits}
                />
              </div>
              <span className="text-[11px] text-ink-3">
                de {pack.remainingCredits} disponíve
                {pack.remainingCredits === 1 ? 'l' : 'is'}
              </span>
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">
              {mode === 'transfer' ? 'pra quem' : 'amigos pra somar'}
            </span>
            {friendsQ.isLoading ? (
              <div className="rounded-xl bg-cream-2 px-4 py-6 text-center text-[13px] text-ink-2">
                carregando amigos…
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-xl bg-cream-2 px-4 py-6 text-center text-[13px] text-ink-2">
                sem amigos elegíveis. adicione amigos pelo seu perfil
                primeiro.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {candidates.map((f) => {
                  const on = picked.includes(f.userId);
                  const limit =
                    mode === 'share' &&
                    !on &&
                    picked.length >= remainingShareSlots;
                  return (
                    <li key={f.userId}>
                      <button
                        type="button"
                        onClick={() => !limit && handlePick(f.userId)}
                        disabled={limit}
                        className={`flex w-full items-center justify-between rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          on
                            ? 'border-clay bg-clay/10'
                            : 'border-sand hover:bg-cream-2'
                        }`}
                      >
                        <span className="text-sm font-semibold">{f.name}</span>
                        {on && (
                          <span className="text-xs font-bold text-clay">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-[13px] font-medium text-clay-d">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-ink-2"
          >
            cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || picked.length === 0}
            className="rounded-full bg-clay px-5 py-2.5 text-[13px] font-bold text-cream transition-opacity disabled:opacity-50"
          >
            {isPending
              ? 'enviando…'
              : mode === 'transfer'
                ? `transferir ${count} crédito${count === 1 ? '' : 's'} →`
                : `adicionar ${picked.length} amigo${picked.length === 1 ? '' : 's'} →`}
          </button>
        </div>
      </form>
    </div>
  );
}
