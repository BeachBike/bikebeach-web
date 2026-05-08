import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  type AdminUnit,
  useAdminUnits,
  useCreateUnit,
  useDeactivateUnit,
  useUpdateUnit,
} from '@/api/admin';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import {
  Drawer,
  FormField,
  TextArea,
  TextInput,
} from '@/components/admin/drawer';
import { ConfirmModal } from '@/components/common';

type FilterStatus = 'all' | 'active' | 'inactive';

export function AdminArenas() {
  const unitsQ = useAdminUnits(true);
  const updateMut = useUpdateUnit();
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<AdminUnit | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  // Reactivate flow: PATCH `isActive: true`. Item-11 fix — until 2026-05
  // there was no UI affordance to bring a desativada arena back, even
  // though the backend always supported it.
  const onReactivate = async (arena: AdminUnit) => {
    setReactivatingId(arena.id);
    try {
      await updateMut.mutateAsync({ id: arena.id, isActive: true });
    } finally {
      setReactivatingId(null);
    }
  };

  const filtered = useMemo(() => {
    const list = unitsQ.data ?? [];
    return list.filter((u) => {
      if (filter === 'active' && !u.isActive) return false;
      if (filter === 'inactive' && u.isActive) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.address.toLowerCase().includes(q) ||
          (u.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [unitsQ.data, filter, search]);

  return (
    <div className="fadein">
      <PageHead
        eyebrow="praças"
        title={
          <>
            arenas
            <br />
            <span className="font-normal italic text-ink-2">da casa.</span>
          </>
        }
        sub="Cadastre as arenas onde rodam as aulas. Cada uma tem sua frota, seu calendário e seus pacotes."
        actions={<Btn tone="clay" onClick={() => setCreating(true)}>nova arena</Btn>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nome, descrição ou endereço"
            className="w-full rounded-full border-[1.5px] border-sand bg-cream py-2.5 pl-10 pr-4 text-sm focus:border-ink focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f
                  ? 'bg-ink text-cream'
                  : 'bg-cream-2 text-ink-2 hover:bg-sand'
              }`}
            >
              {f === 'all' ? 'todas' : f === 'active' ? 'ativas' : 'desativadas'}
            </button>
          ))}
        </div>
      </div>

      {unitsQ.isLoading ? (
        <div className="text-ink-2">Carregando...</div>
      ) : unitsQ.isError ? (
        <div className="text-clay-d">Erro ao carregar arenas.</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="display-tight text-[22px]">
            {unitsQ.data?.length === 0
              ? 'nenhuma arena ainda'
              : 'sem resultados'}
          </div>
          <div className="mt-2 text-sm text-ink-2">
            {unitsQ.data?.length === 0
              ? 'Cadastre a primeira arena para liberar o resto do admin.'
              : 'Tente outro filtro ou termo de busca.'}
          </div>
          {unitsQ.data?.length === 0 && (
            <div className="mt-4 inline-flex">
              <Btn tone="clay" onClick={() => setCreating(true)}>
                cadastrar arena
              </Btn>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((arena) => (
            <ArenaCard
              key={arena.id}
              arena={arena}
              onEdit={() => setEditing(arena)}
              onDeactivate={() => setDeactivating(arena)}
              onReactivate={() => onReactivate(arena)}
              reactivating={reactivatingId === arena.id}
            />
          ))}
        </div>
      )}

      <ArenaFormDrawer
        open={creating || !!editing}
        editing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <DeactivateConfirm
        target={deactivating}
        onClose={() => setDeactivating(null)}
      />
    </div>
  );
}

interface ArenaCardProps {
  arena: AdminUnit;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  reactivating: boolean;
}

/// Card redesign 2026-05 (item-11):
///   - `min-w-0` on every truncate column so long names/descriptions
///     can't push the layout overflow on narrow viewports.
///   - footer with always-visible actions (no more `opacity-0`
///     hover-only — touch devices couldn't see them).
///   - reactivate button surfaces when the arena is desativada.
function ArenaCard({
  arena,
  onEdit,
  onDeactivate,
  onReactivate,
  reactivating,
}: ArenaCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-sand bg-cream p-5 transition-shadow hover:shadow-card">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl text-lg ${
            arena.isActive
              ? 'bg-clay text-cream'
              : 'bg-cream-2 text-ink-2'
          }`}
        >
          <PinIcon />
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="display-tight truncate text-[20px] leading-tight">
            {arena.name}
          </span>
          <span className="mt-0.5 truncate text-xs text-ink-2">
            {arena.address}
          </span>
        </button>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            arena.isActive
              ? 'bg-[#E5EFE3] text-[#3F7A4F]'
              : 'bg-[#F1D6CA] text-clay-d'
          }`}
        >
          {arena.isActive ? 'ativa' : 'desativada'}
        </span>
      </div>

      {arena.description && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">
          {arena.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-2">
        <Pill label={`${arena.operationalBikeCount} bikes ativas`} />
        <Pill label={`grade ${arena.maxRows}×${arena.maxCols}`} />
      </div>

      <footer className="-mx-5 -mb-5 mt-1 flex items-center justify-end gap-1.5 border-t border-sand bg-cream-2/60 px-4 py-2.5">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-ink-2 hover:bg-cream"
        >
          editar
        </button>
        {arena.isActive ? (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-full px-3 py-1 text-[11px] font-semibold text-clay-d hover:bg-clay-d/10"
          >
            desativar
          </button>
        ) : (
          <button
            type="button"
            onClick={onReactivate}
            disabled={reactivating}
            className="rounded-full bg-clay px-3 py-1 text-[11px] font-bold text-cream transition-colors hover:bg-clay-d disabled:opacity-60"
          >
            {reactivating ? 'reativando…' : 'reativar'}
          </button>
        )}
      </footer>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-cream-2 px-2.5 py-0.5">{label}</span>
  );
}

interface ArenaFormDrawerProps {
  open: boolean;
  editing: AdminUnit | null;
  onClose: () => void;
}

function ArenaFormDrawer({ open, editing, onClose }: ArenaFormDrawerProps) {
  const createMut = useCreateUnit();
  const updateMut = useUpdateUnit();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setSlug(editing?.slug ?? '');
    setAddress(editing?.address ?? '');
    setDescription(editing?.description ?? '');
    setError(null);
    setSlugTouched(!!editing);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Auto-derive slug from name while creating, until user manually edits it.
  useEffect(() => {
    if (editing) return;
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, editing, slugTouched]);

  const isPending = createMut.isPending || updateMut.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!editing && !slug.trim()) return setError('Slug é obrigatório.');
    if (!editing && !/^[a-z0-9-]{2,60}$/.test(slug.trim())) {
      return setError('Slug deve ser kebab-case (a-z, 0-9, hífen, 2–60 chars).');
    }
    if (!address.trim()) return setError('Endereço é obrigatório.');

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: name.trim(),
          address: address.trim(),
          description: description.trim() || null,
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          slug: slug.trim(),
          address: address.trim(),
          description: description.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar arena.');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={editing ? 'editar arena' : 'nova arena'}
      subtitle={
        editing
          ? 'O slug não pode ser alterado depois do cadastro (URLs públicas dependem dele).'
          : 'Cada arena tem seu próprio calendário, frota e catálogo.'
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
            {isPending
              ? 'salvando...'
              : editing
                ? 'salvar alterações'
                : 'cadastrar arena'}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="nome">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="BC Central"
            maxLength={120}
          />
        </FormField>

        <FormField
          label="slug"
          hint={
            editing
              ? 'imutável após o cadastro.'
              : 'identificador em URL — deixe auto-derivado ou edite manualmente.'
          }
        >
          <TextInput
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            disabled={!!editing}
            placeholder="bc-central"
            maxLength={60}
          />
        </FormField>

        <FormField label="onde fica" hint="endereço completo, com referências.">
          <TextInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Praia Central — Balneário Camboriú, SC"
            maxLength={300}
          />
        </FormField>

        <FormField
          label="descrição"
          hint="aparece na home e no detalhe da arena no admin."
        >
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Entre os postos 4 e 5, com palmeiras e som ambiente do mar."
          />
        </FormField>

        {/*
          2026-05 — `capacidade padrão`, `tolerância check-in` e `desconto PIX`
          foram removidos do formulário. Capacidade vira a contagem de bikes
          operacionais; tolerância e PIX são constantes globais (5 min, 5%).
          Wave D vai redesenhar essa tab inteira, então os campos de grid
          (maxRows / maxCols) ficam pra lá.
        */}

        {error && (
          <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            {error}
          </div>
        )}
      </form>
    </Drawer>
  );
}

interface DeactivateConfirmProps {
  target: AdminUnit | null;
  onClose: () => void;
}

function DeactivateConfirm({ target, onClose }: DeactivateConfirmProps) {
  const mut = useDeactivateUnit();

  if (!target) return null;

  return (
    <ConfirmModal
      open={!!target}
      onClose={() => {
        if (mut.isPending) return;
        mut.reset();
        onClose();
      }}
      onConfirm={async () => {
        try {
          await mut.mutateAsync(target.id);
          onClose();
        } catch {
          // The error toast UX comes in a later pass; for now silent.
        }
      }}
      title={
        <>
          desativar <span className="italic">{target.name}</span>?
        </>
      }
      description="A arena some das listas públicas (home, /planos, reservar) e ninguém consegue mais marcar aula. Aulas já agendadas continuam ativas. Você pode reativar depois — esse fluxo é reversível."
      confirmLabel="desativar arena"
      cancelLabel="voltar"
      confirmTone="clay"
      loading={mut.isPending}
    />
  );
}

function PinIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 5-9 12-9 12s-9-7-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
