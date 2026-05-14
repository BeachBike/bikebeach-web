import { useEffect, useState, type FormEvent } from 'react';
import {
  type AdminPackOffer,
  type AdminPlan,
  useAdminPackOffers,
  useAdminPlans,
  useCreatePackOffer,
  useCreatePlan,
  useUpdatePackOffer,
  useUpdatePlan,
} from '@/api/admin';
import { formatCents } from '@/lib/format';
import {
  previewDiscount,
  resolveDiscount,
  shortDate,
} from '@/lib/discount';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import {
  Drawer,
  FormField,
  TextInput,
} from '@/components/admin/drawer';
import { InputMoney, InputNumber, InputPercent } from '@/components/common';

interface AdminPlansAndOffersProps {
  unitId: string | undefined;
}

type CreateMode = 'plan' | 'offer' | null;
type EditTarget =
  | { kind: 'plan'; plan: AdminPlan }
  | { kind: 'offer'; offer: AdminPackOffer }
  | null;

export function AdminPlansAndOffers({ unitId }: AdminPlansAndOffersProps) {
  const plansQ = useAdminPlans();
  const offersQ = useAdminPackOffers(unitId);
  const updatePlanMut = useUpdatePlan();
  const updateOfferMut = useUpdatePackOffer();

  const [creating, setCreating] = useState<CreateMode>(null);
  const [editing, setEditing] = useState<EditTarget>(null);

  if (plansQ.isLoading || offersQ.isLoading) {
    return <div className="text-ink-2">Carregando...</div>;
  }

  return (
    <div className="fadein">
      <PageHead
        eyebrow="catálogo"
        title={
          <>
            planos &
            <br />
            <span className="font-normal italic text-ink-2">pacotes.</span>
          </>
        }
        sub="Defina o que aparece em /planos. Cada item pode ter campanha de desconto com janela de tempo — útil para promoções sazonais."
        actions={
          <>
            <Btn ghost onClick={() => setCreating('offer')}>
              novo pacote
            </Btn>
            <Btn tone="clay" onClick={() => setCreating('plan')}>
              novo plano
            </Btn>
          </>
        }
      />

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            mensalidade
          </div>
          <div className="display-tight mt-1 mb-4 text-[30px]">planos</div>
          <div className="space-y-2.5">
            {plansQ.data?.map((plan) => (
              <Row
                key={plan.id}
                title={plan.name}
                detail={`${plan.monthlyCredits} aulas/mês • ${formatCents(plan.priceCents)}`}
                campaign={plan}
                priceCents={plan.priceCents}
                isActive={plan.isActive}
                disabled={updatePlanMut.isPending}
                onEdit={() => setEditing({ kind: 'plan', plan })}
                onToggle={() =>
                  updatePlanMut.mutate({
                    id: plan.id,
                    isActive: !plan.isActive,
                  })
                }
              />
            ))}
            {!plansQ.data?.length && (
              <EmptyHint
                cta="criar primeiro plano"
                onClick={() => setCreating('plan')}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wide text-clay">
            avulso
          </div>
          <div className="display-tight mt-1 mb-4 text-[30px]">pacotes</div>
          <div className="space-y-2.5">
            {offersQ.data?.map((offer) => (
              <Row
                key={offer.id}
                title={`${offer.classes} ${offer.classes === 1 ? 'aula' : 'aulas'}`}
                detail={`${formatCents(offer.priceCents)} • validade ${offer.expirationDays} dias`}
                campaign={offer}
                priceCents={offer.priceCents}
                isActive={offer.isActive}
                disabled={updateOfferMut.isPending}
                onEdit={() => setEditing({ kind: 'offer', offer })}
                onToggle={() =>
                  updateOfferMut.mutate({
                    id: offer.id,
                    isActive: !offer.isActive,
                  })
                }
              />
            ))}
            {!offersQ.data?.length && (
              <EmptyHint
                cta="criar primeiro pacote"
                onClick={() => setCreating('offer')}
              />
            )}
          </div>
        </Card>
      </div>

      <PlanFormDrawer
        open={creating === 'plan' || editing?.kind === 'plan'}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
        editing={editing?.kind === 'plan' ? editing.plan : null}
      />
      <PackOfferFormDrawer
        open={creating === 'offer' || editing?.kind === 'offer'}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
        unitId={unitId}
        editing={editing?.kind === 'offer' ? editing.offer : null}
      />
    </div>
  );
}

interface RowProps {
  title: string;
  detail: string;
  campaign: {
    discountPercent: number | null;
    discountStartsAt: string | null;
    discountEndsAt: string | null;
  };
  priceCents: number;
  isActive: boolean;
  disabled: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function Row({
  title,
  detail,
  campaign,
  priceCents,
  isActive,
  disabled,
  onToggle,
  onEdit,
}: RowProps) {
  const live = resolveDiscount(priceCents, campaign);
  const planned = !live ? previewDiscount(priceCents, campaign) : null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xs border border-sand bg-cream-2 px-4 py-3">
      <button type="button" onClick={onEdit} className="flex-1 text-left">
        <div className="text-[15px] font-semibold text-ink">{title}</div>
        <div className="text-xs text-ink-2">{detail}</div>
        {live && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-clay-d">
            <span>−{live.percent}% até {shortDate(live.endsAt)}</span>
          </div>
        )}
        {planned && !live && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-3 ring-1 ring-sand">
            <span>
              −{planned.percent}% de {shortDate(planned.startsAt)} até {shortDate(planned.endsAt)}
            </span>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isActive
            ? 'bg-sea text-cream hover:bg-sea-d'
            : 'bg-cream text-ink-2 ring-1 ring-sand hover:bg-cream-2'
        }`}
      >
        {isActive ? 'ativo' : 'pausado'}
      </button>
    </div>
  );
}

function EmptyHint({ cta, onClick }: { cta: string; onClick: () => void }) {
  return (
    <div className="rounded-xs border border-dashed border-sand-2 bg-cream-2 px-4 py-6 text-center">
      <div className="mb-2 text-sm text-ink-2">Nenhum item ainda.</div>
      <Btn tone="ink" onClick={onClick}>
        {cta}
      </Btn>
    </div>
  );
}

interface DiscountFieldsState {
  percent: number | null;
  startsAt: string;
  endsAt: string;
}

/// Reusable discount section for both drawers. Shows percent + 2 date
/// inputs + a live preview of the discounted price. When all 3 fields are
/// blank the campaign is cleared on submit.
function DiscountSection({
  state,
  onChange,
  priceCents,
}: {
  state: DiscountFieldsState;
  onChange: (next: DiscountFieldsState) => void;
  priceCents: number;
}) {
  const preview = previewDiscount(priceCents, {
    discountPercent: state.percent,
    discountStartsAt: state.startsAt
      ? new Date(state.startsAt).toISOString()
      : null,
    discountEndsAt: state.endsAt
      ? new Date(state.endsAt + 'T23:59:59').toISOString()
      : null,
  });

  const allEmpty = state.percent == null && !state.startsAt && !state.endsAt;
  const someFilled = !allEmpty;

  return (
    <div className="rounded-xs border border-dashed border-sand-2 bg-cream-2/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-clay">
            campanha de desconto
          </div>
          <div className="mt-0.5 text-xs text-ink-3">
            opcional · janela de tempo. Deixe em branco para não rodar.
          </div>
        </div>
        {someFilled && (
          <button
            type="button"
            onClick={() => onChange({ percent: null, startsAt: '', endsAt: '' })}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-clay-d hover:bg-clay-d/10"
          >
            limpar
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <FormField label="% de desconto">
          <InputPercent
            value={state.percent}
            onChange={(v) => onChange({ ...state, percent: v })}
            min={0}
            max={100}
          />
        </FormField>
        <FormField label="começa em">
          <TextInput
            type="date"
            value={state.startsAt}
            onChange={(e) => onChange({ ...state, startsAt: e.target.value })}
          />
        </FormField>
        <FormField label="termina em">
          <TextInput
            type="date"
            value={state.endsAt}
            onChange={(e) => onChange({ ...state, endsAt: e.target.value })}
          />
        </FormField>
      </div>

      {preview && (
        <div className="mt-3 rounded-xs bg-cream px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-ink-3 line-through">
              {formatCents(priceCents)}
            </span>
            <span className="font-bold text-clay-d">
              {formatCents(preview.discountedCents)}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-clay-d">
              −{preview.percent}%
            </span>
          </div>
          <div className="mt-1 text-xs text-ink-2">
            economia de {formatCents(preview.savingsCents)} · ativo de{' '}
            {shortDate(preview.startsAt)} até {shortDate(preview.endsAt)}
          </div>
        </div>
      )}
    </div>
  );
}

interface PlanFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: AdminPlan | null;
}

function PlanFormDrawer({ open, onClose, editing }: PlanFormDrawerProps) {
  const createMut = useCreatePlan();
  const updateMut = useUpdatePlan();
  const [name, setName] = useState(editing?.name ?? '');
  // 2026-05 (item-14) — InputNumber for credits, InputMoney for price
  // (handles centavos + R$ mask). Replaces the bare <input type="number">
  // with arrows + manual decimal parse.
  const [monthlyCredits, setMonthlyCredits] = useState<number | null>(
    editing?.monthlyCredits ?? 999,
  );
  const [priceCents, setPriceCents] = useState<number | null>(
    editing?.priceCents ?? null,
  );
  const [discount, setDiscount] = useState<DiscountFieldsState>({
    percent: null,
    startsAt: '',
    endsAt: '',
  });
  const [error, setError] = useState<string | null>(null);

  useResetOnOpen(open, () => {
    setName(editing?.name ?? '');
    setMonthlyCredits(editing?.monthlyCredits ?? 999);
    setPriceCents(editing?.priceCents ?? null);
    setDiscount({
      percent: editing?.discountPercent ?? null,
      startsAt: editing?.discountStartsAt
        ? toDateInput(new Date(editing.discountStartsAt))
        : '',
      endsAt: editing?.discountEndsAt
        ? toDateInput(new Date(editing.discountEndsAt))
        : '',
    });
    setError(null);
    createMut.reset();
    updateMut.reset();
  });

  const previewCents = priceCents ?? 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (monthlyCredits == null || monthlyCredits < 1)
      return setError('Aulas/mês precisa ser >= 1.');
    if (priceCents == null || priceCents < 0)
      return setError('Preço inválido.');

    const discountPayload = buildDiscountPayload(discount, !!editing);
    if (discountPayload === 'invalid') {
      return setError(
        'Campanha de desconto: preencha %, início e fim juntos. O início precisa vir antes do fim.',
      );
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: name.trim(),
          monthlyCredits,
          priceCents,
          ...discountPayload,
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          monthlyCredits,
          priceCents,
          ...(discountPayload.discountPercent != null && {
            discountPercent: discountPayload.discountPercent,
            discountStartsAt: discountPayload.discountStartsAt!,
            discountEndsAt: discountPayload.discountEndsAt!,
          }),
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar plano.');
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Drawer
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={editing ? 'editar plano' : 'novo plano'}
      subtitle={
        editing
          ? `Atualize valores ou rode uma campanha de desconto.`
          : `O plano fica visível em /planos quando ativo.`
      }
      footer={
        <>
          <Btn ghost onClick={onClose}>
            cancelar
          </Btn>
          <Btn
            tone="clay"
            onClick={() => submit(new Event('submit') as unknown as FormEvent)}
            disabled={isPending}
          >
            {isPending ? 'salvando...' : editing ? 'salvar' : 'criar plano'}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="nome do plano">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maré Cheia"
            maxLength={120}
          />
        </FormField>
        <FormField label="aulas por mês" hint="999 = ilimitado">
          <InputNumber
            value={monthlyCredits}
            onChange={setMonthlyCredits}
            min={1}
            max={1000}
          />
        </FormField>
        <FormField label="preço" hint="ex. R$ 389,00">
          <InputMoney
            value={priceCents}
            onChange={setPriceCents}
            min={0}
          />
        </FormField>

        <DiscountSection
          state={discount}
          onChange={setDiscount}
          priceCents={Number.isFinite(previewCents) ? previewCents : 0}
        />

        {error && (
          <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            {error}
          </div>
        )}
      </form>
    </Drawer>
  );
}

interface PackOfferFormDrawerProps {
  open: boolean;
  onClose: () => void;
  unitId: string | undefined;
  editing: AdminPackOffer | null;
}

function PackOfferFormDrawer({
  open,
  onClose,
  editing,
}: PackOfferFormDrawerProps) {
  const createMut = useCreatePackOffer();
  const updateMut = useUpdatePackOffer();
  const [classes, setClasses] = useState<number | null>(editing?.classes ?? 5);
  const [priceCents, setPriceCents] = useState<number | null>(
    editing?.priceCents ?? null,
  );
  const [expirationDays, setExpirationDays] = useState<number | null>(
    editing?.expirationDays ?? 60,
  );
  const [isTransferable, setIsTransferable] = useState<boolean>(
    editing?.isTransferable ?? false,
  );
  const [maxSharedUsers, setMaxSharedUsers] = useState<number | null>(
    editing?.maxSharedUsers ?? 0,
  );
  const [discount, setDiscount] = useState<DiscountFieldsState>({
    percent: null,
    startsAt: '',
    endsAt: '',
  });
  const [error, setError] = useState<string | null>(null);

  useResetOnOpen(open, () => {
    setClasses(editing?.classes ?? 5);
    setPriceCents(editing?.priceCents ?? null);
    setExpirationDays(editing?.expirationDays ?? 60);
    setIsTransferable(editing?.isTransferable ?? false);
    setMaxSharedUsers(editing?.maxSharedUsers ?? 0);
    setDiscount({
      percent: editing?.discountPercent ?? null,
      startsAt: editing?.discountStartsAt
        ? toDateInput(new Date(editing.discountStartsAt))
        : '',
      endsAt: editing?.discountEndsAt
        ? toDateInput(new Date(editing.discountEndsAt))
        : '',
    });
    setError(null);
    createMut.reset();
    updateMut.reset();
  });

  const previewCents = priceCents ?? 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (classes == null || classes < 1)
      return setError('Quantidade de aulas precisa ser >= 1.');
    if (priceCents == null || priceCents < 1)
      return setError('Preço inválido.');
    if (expirationDays == null || expirationDays < 1)
      return setError('Validade precisa ser >= 1.');
    const sharedN = maxSharedUsers ?? 0;
    if (sharedN < 0 || sharedN > 10)
      return setError('Compartilhamento aceita até 10 amigos.');

    const discountPayload = buildDiscountPayload(discount, !!editing);
    if (discountPayload === 'invalid') {
      return setError(
        'Campanha de desconto: preencha %, início e fim juntos. O início precisa vir antes do fim.',
      );
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          priceCents,
          expirationDays,
          isTransferable,
          maxSharedUsers: sharedN,
          ...discountPayload,
        });
      } else {
        await createMut.mutateAsync({
          classes,
          priceCents,
          expirationDays,
          isTransferable,
          maxSharedUsers: sharedN,
          ...(discountPayload.discountPercent != null && {
            discountPercent: discountPayload.discountPercent,
            discountStartsAt: discountPayload.discountStartsAt!,
            discountEndsAt: discountPayload.discountEndsAt!,
          }),
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar pacote.');
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Drawer
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={editing ? 'editar pacote' : 'novo pacote'}
      subtitle={
        editing
          ? 'Não é possível mudar a quantidade — crie outro pacote para isso.'
          : 'Pacotes são globais — valem em qualquer arena.'
      }
      footer={
        <>
          <Btn ghost onClick={onClose}>
            cancelar
          </Btn>
          <Btn
            tone="clay"
            onClick={() => submit(new Event('submit') as unknown as FormEvent)}
            disabled={isPending}
          >
            {isPending ? 'salvando...' : editing ? 'salvar' : 'criar pacote'}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="quantidade de aulas" hint="1, 5, 10, 20...">
          {/* `disabled` no InputNumber não existe; pra edit a gente
              renderiza um chip read-only equivalente. */}
          {editing ? (
            <div className="rounded-xs border-[1.5px] border-sand bg-cream-2 px-3.5 py-3 text-sm text-ink-2">
              {classes ?? '—'} aula{classes === 1 ? '' : 's'} (imutável após
              criar)
            </div>
          ) : (
            <InputNumber
              value={classes}
              onChange={setClasses}
              min={1}
              max={200}
            />
          )}
        </FormField>
        <FormField label="preço" hint="ex. R$ 540,00">
          <InputMoney
            value={priceCents}
            onChange={setPriceCents}
            min={0}
          />
        </FormField>
        <FormField label="validade" hint="dias até o pacote expirar — ex. 60, 90">
          <InputNumber
            value={expirationDays}
            onChange={setExpirationDays}
            min={1}
            max={720}
          />
        </FormField>

        <FormField
          label="transferível para amigos"
          hint="quando ligado, o comprador pode mandar créditos avulsos pra amigos (precisa ter amizade aceita)."
        >
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isTransferable}
              onChange={(e) => setIsTransferable(e.target.checked)}
              className="size-4 accent-clay"
            />
            <span>{isTransferable ? 'sim — transferível' : 'não — uso individual'}</span>
          </label>
        </FormField>

        <FormField
          label="compartilhar com até quantos amigos"
          hint="0 desliga o compartilhamento. Acima de 0, o comprador escolhe N amigos no checkout e todos consomem do mesmo saldo."
        >
          <InputNumber
            value={maxSharedUsers}
            onChange={setMaxSharedUsers}
            min={0}
            max={10}
          />
        </FormField>

        <DiscountSection
          state={discount}
          onChange={setDiscount}
          priceCents={previewCents}
        />

        {error && (
          <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            {error}
          </div>
        )}
      </form>
    </Drawer>
  );
}

/// Build the discount fields slice that goes onto the mutation payload.
/// Returns `'invalid'` when the user filled some but not all fields, or
/// when start >= end.
function buildDiscountPayload(
  state: DiscountFieldsState,
  isEditing: boolean,
):
  | {
      discountPercent: number | null;
      discountStartsAt: string | null;
      discountEndsAt: string | null;
    }
  | 'invalid' {
  const allEmpty = state.percent == null && !state.startsAt && !state.endsAt;
  if (allEmpty) {
    // On edit: clear the campaign by sending nulls. On create: omit.
    return isEditing
      ? {
          discountPercent: null,
          discountStartsAt: null,
          discountEndsAt: null,
        }
      : {
          discountPercent: null,
          discountStartsAt: null,
          discountEndsAt: null,
        };
  }
  if (state.percent == null || !state.startsAt || !state.endsAt) {
    return 'invalid';
  }
  // Convert YYYY-MM-DD to ISO at start-of-day / end-of-day local.
  const startsLocal = new Date(`${state.startsAt}T00:00:00`);
  const endsLocal = new Date(`${state.endsAt}T23:59:59`);
  if (
    Number.isNaN(startsLocal.getTime()) ||
    Number.isNaN(endsLocal.getTime())
  ) {
    return 'invalid';
  }
  if (startsLocal.getTime() >= endsLocal.getTime()) return 'invalid';
  return {
    discountPercent: state.percent,
    discountStartsAt: startsLocal.toISOString(),
    discountEndsAt: endsLocal.toISOString(),
  };
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function useResetOnOpen(open: boolean, reset: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) reset();
  }, [open]);
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
