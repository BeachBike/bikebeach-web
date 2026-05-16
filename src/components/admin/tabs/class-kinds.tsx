import { useEffect, useState, type FormEvent } from 'react';
import {
  type AdminClassKind,
  type ClassKindColor,
  useAdminClassKinds,
  useCascadeDeleteClassKind,
  useCreateClassKind,
  useDeleteClassKind,
  useUpdateClassKind,
} from '@/api/admin';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import {
  Drawer,
  FormField,
  Select,
  TextInput,
} from '@/components/admin/drawer';
import { ConfirmModal, InputNumber } from '@/components/common';

type EditingKind = AdminClassKind | null;

const COLOR_PALETTE: { token: ClassKindColor; label: string; cssVar: string; fg: string }[] = [
  { token: 'CLAY', label: 'clay', cssVar: 'var(--color-clay)', fg: 'var(--color-cream)' },
  { token: 'SUN', label: 'sun', cssVar: 'var(--color-sun)', fg: 'var(--color-ink)' },
  { token: 'SEA', label: 'sea', cssVar: 'var(--color-sea)', fg: 'var(--color-cream)' },
  { token: 'SAND', label: 'sand', cssVar: 'var(--color-sand-2)', fg: 'var(--color-ink)' },
  { token: 'INK', label: 'ink', cssVar: 'var(--color-ink)', fg: 'var(--color-cream)' },
  { token: 'GREEN', label: 'green', cssVar: 'var(--color-success)', fg: 'var(--color-cream)' },
];

function paletteOf(token: ClassKindColor) {
  return COLOR_PALETTE.find((p) => p.token === token) ?? COLOR_PALETTE[2];
}

export function AdminClassKinds() {
  const kindsQ = useAdminClassKinds();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EditingKind>(null);
  const [search, setSearch] = useState('');
  const [deactivating, setDeactivating] = useState<AdminClassKind | null>(null);
  const [deletingHard, setDeletingHard] = useState<AdminClassKind | null>(null);

  const filtered = (kindsQ.data ?? []).filter((k) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return k.name.toLowerCase().includes(q) || k.slug.toLowerCase().includes(q);
  });

  return (
    <div className="fadein">
      <PageHead
        eyebrow="catálogo"
        title={
          <>
            tipos de
            <br />
            <span className="font-normal italic text-ink-2">aula.</span>
          </>
        }
        sub="Defina as categorias e a cor que cada uma representa. Inativar bloqueia novas aulas; excluir cancela todas as aulas existentes do tipo."
        actions={<Btn tone="clay" onClick={() => setCreating(true)}>novo tipo</Btn>}
      />

      <div className="mb-5 flex">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nome ou slug"
            className="w-full rounded-full border-[1.5px] border-sand bg-cream py-2.5 pl-10 pr-4 text-sm focus:border-ink focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {kindsQ.isLoading ? (
        <div className="text-ink-2">Carregando...</div>
      ) : kindsQ.isError ? (
        <div className="text-clay-d">Erro ao carregar tipos de aula.</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="display-tight text-[22px]">
            {(kindsQ.data?.length ?? 0) === 0
              ? 'nenhum tipo cadastrado'
              : 'sem resultados'}
          </div>
          <div className="mt-2 text-sm text-ink-2">
            {(kindsQ.data?.length ?? 0) === 0
              ? 'Crie tipos de aula para que professores escolham sua especialidade.'
              : 'Tente outro filtro ou termo de busca.'}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((kind) => (
            <ClassKindCard
              key={kind.id}
              kind={kind}
              onEdit={() => setEditing(kind)}
              onDeactivate={() => setDeactivating(kind)}
              onDelete={() => setDeletingHard(kind)}
            />
          ))}
        </div>
      )}

      <ClassKindFormDrawer
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

      <CascadeDeleteConfirm
        target={deletingHard}
        onClose={() => setDeletingHard(null)}
      />
    </div>
  );
}

interface ClassKindCardProps {
  kind: AdminClassKind;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

function ClassKindCard({
  kind,
  onEdit,
  onDeactivate,
  onDelete,
}: ClassKindCardProps) {
  const palette = paletteOf(kind.colorToken);

  // Header cap with the chosen color — instant visual ID, matches the tone
  // we use elsewhere (arena card, instructor avatar). Footer keeps the two
  // destructive actions always visible (no hover-only — better on touch).
  return (
    <article className="group flex flex-col gap-3.5 overflow-hidden rounded-lg border border-sand bg-cream transition-all hover:-translate-y-0.5 hover:shadow-card">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 flex-col gap-3 text-left"
      >
        <div
          className="px-5 pb-3 pt-4 text-cream"
          style={{ background: palette.cssVar, color: palette.fg }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                className="display-tight truncate"
                style={{ fontSize: 22, lineHeight: 1.05 }}
              >
                {kind.name.toLowerCase()}
              </div>
              <div className="mono mt-0.5 truncate text-[11px] opacity-80">
                {kind.slug}
              </div>
            </div>
            {!kind.isActive && (
              <span className="shrink-0 rounded-full bg-cream/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                inativo
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-5 pb-3">
          {kind.tone && (
            <div className="text-[13px] italic leading-relaxed text-ink-2 line-clamp-2">
              {kind.tone}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5 border-y border-sand py-3">
            <Stat label="duração" value={`${kind.defaultDurationMinutes} min`} />
            <Stat
              label="intensidade"
              value={kind.intensity ? `${kind.intensity}/5` : '—'}
            />
            <Stat
              label={kind.scheduledSlotsCount === 1 ? 'aula' : 'aulas'}
              value={kind.scheduledSlotsCount}
            />
          </div>
        </div>
      </button>

      <footer className="flex items-center justify-end gap-1.5 border-t border-sand bg-cream-2/50 px-4 py-2.5">
        {kind.isActive && (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-full px-3 py-1 text-[11px] font-semibold text-ink-2 hover:bg-cream"
          >
            desativar
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-clay-d hover:bg-clay-d/10"
        >
          excluir
        </button>
      </footer>
    </article>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <span
        className="display-tight mono"
        style={{ fontSize: 18, marginTop: 2 }}
      >
        {value}
      </span>
    </div>
  );
}

interface ClassKindFormDrawerProps {
  open: boolean;
  editing: AdminClassKind | null;
  onClose: () => void;
}

function ClassKindFormDrawer({
  open,
  editing,
  onClose,
}: ClassKindFormDrawerProps) {
  const createMut = useCreateClassKind();
  const updateMut = useUpdateClassKind();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [duration, setDuration] = useState<number | null>(45);
  // Intensity is required now — defaults to 3 ("média"). The "sem
  // intensidade" option was removed in 2026-05 because every kind needs a
  // pegada display value across the app.
  const [intensity, setIntensity] = useState<number>(3);
  const [tone, setTone] = useState('');
  const [colorToken, setColorToken] = useState<ClassKindColor>('SEA');
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setSlug(editing?.slug ?? '');
    setDuration(editing?.defaultDurationMinutes ?? 45);
    setIntensity(editing?.intensity ?? 3);
    setTone(editing?.tone ?? '');
    setColorToken(editing?.colorToken ?? 'SEA');
    setError(null);
    setSlugTouched(!!editing);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Auto-derive slug from name while creating until user touches it.
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
    if (!editing && !/^[a-z0-9-]{2,40}$/.test(slug.trim())) {
      return setError('Slug inválido (a-z, 0-9, hífens, 2–40 chars).');
    }
    if (!duration || duration < 15 || duration > 180) {
      return setError('Duração deve estar entre 15 e 180 min.');
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: name.trim(),
          defaultDurationMinutes: duration,
          intensity,
          tone: tone.trim() || undefined,
          colorToken,
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          slug: slug.trim(),
          defaultDurationMinutes: duration,
          intensity,
          tone: tone.trim() || undefined,
          colorToken,
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar tipo de aula.');
    }
  };

  return (
    <Drawer
      open={open}
      title={editing ? 'editar tipo de aula' : 'novo tipo de aula'}
      onClose={isPending ? () => {} : onClose}
      footer={
        <>
          <Btn ghost onClick={onClose} disabled={isPending}>
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
                : 'cadastrar tipo'}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="nome" hint="display em pt-BR (ex. Sunset, Power)">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sunset"
            maxLength={60}
          />
        </FormField>

        <FormField
          label="slug"
          hint={
            editing
              ? 'imutável após o cadastro.'
              : 'identificador em URL — auto-derivado do nome.'
          }
        >
          <TextInput
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            disabled={!!editing}
            placeholder="sunset"
            maxLength={40}
          />
        </FormField>

        <FormField
          label="cor"
          hint="aparece no calendário, na home e nos chips de aula."
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {COLOR_PALETTE.map((p) => {
              const selected = colorToken === p.token;
              return (
                <button
                  key={p.token}
                  type="button"
                  onClick={() => setColorToken(p.token)}
                  className={`group flex flex-col items-center gap-1.5 rounded-xs border-2 px-2 py-2.5 transition-all ${
                    selected
                      ? 'border-ink bg-cream-2'
                      : 'border-sand bg-cream hover:border-ink-3'
                  }`}
                  aria-pressed={selected}
                  title={p.label}
                >
                  <span
                    className="size-6 rounded-full ring-2"
                    style={{
                      background: p.cssVar,
                      ['--tw-ring-color' as string]: selected
                        ? 'var(--color-ink)'
                        : 'transparent',
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="duração padrão (min)">
            <InputNumber
              value={duration}
              onChange={setDuration}
              min={15}
              max={180}
            />
          </FormField>
          <FormField label="intensidade">
            <Select
              value={intensity.toString()}
              onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
            >
              <option value="1">1 (muito fraco)</option>
              <option value="2">2 (fraco)</option>
              <option value="3">3 (média)</option>
              <option value="4">4 (forte)</option>
              <option value="5">5 (muito forte)</option>
            </Select>
          </FormField>
        </div>

        <FormField
          label="tom / vibe"
          hint="copy editorial — ex. 'Pôr do sol intenso'."
        >
          <TextInput
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Despertar enérgico"
            maxLength={120}
          />
        </FormField>

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
  target: AdminClassKind | null;
  onClose: () => void;
}

function DeactivateConfirm({ target, onClose }: DeactivateConfirmProps) {
  const mut = useDeleteClassKind();
  if (!target) return null;
  return (
    <ConfirmModal
      open
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
          // toast em iteração futura
        }
      }}
      title={
        <>
          desativar <span className="italic">{target.name}</span>?
        </>
      }
      description={
        <>
          As {target.scheduledSlotsCount > 0 ? target.scheduledSlotsCount : ''}{' '}
          {target.scheduledSlotsCount === 1
            ? 'aula agendada continua'
            : target.scheduledSlotsCount > 1
              ? 'aulas agendadas continuam'
              : 'aulas existentes continuam'}{' '}
          rolando — só não dá mais pra criar aula nova com esse tipo. Você pode
          reativar depois.
        </>
      }
      confirmLabel="desativar tipo"
      cancelLabel="voltar"
      confirmTone="ink"
      loading={mut.isPending}
    />
  );
}

interface CascadeDeleteConfirmProps {
  target: AdminClassKind | null;
  onClose: () => void;
}

function CascadeDeleteConfirm({ target, onClose }: CascadeDeleteConfirmProps) {
  const mut = useCascadeDeleteClassKind();
  if (!target) return null;
  const count = target.scheduledSlotsCount;
  return (
    <ConfirmModal
      open
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
          // toast depois
        }
      }}
      title={
        <>
          excluir <span className="italic">{target.name}</span>?
        </>
      }
      description={
        count > 0 ? (
          <>
            Isso vai cancelar{' '}
            <b>
              {count} aula{count === 1 ? '' : 's'} agendada{count === 1 ? '' : 's'}
            </b>{' '}
            como <i>STUDIO / OUTRO · &ldquo;tipo de aula removido&rdquo;</i>,
            devolver crédito pra todos os reservados, limpar a fila de espera e
            apagar este tipo do catálogo. Aulas já concluídas / canceladas
            ficam no histórico mas perdem a referência ao tipo.
          </>
        ) : (
          <>
            Não há aulas agendadas com esse tipo — a remoção é direta. Aulas já
            concluídas / canceladas ficam no histórico mas perdem a referência
            ao tipo.
          </>
        )
      }
      confirmLabel={count > 0 ? `cancelar ${count} e excluir` : 'excluir tipo'}
      cancelLabel="voltar"
      confirmTone="clay"
      loading={mut.isPending}
    />
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 ml-3 mt-[11px] h-4 w-4 text-ink-2"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
        clipRule="evenodd"
      />
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
    .slice(0, 40);
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
