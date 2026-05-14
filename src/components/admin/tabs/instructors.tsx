import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  type AdminStaff,
  type AdminUnit,
  type ClassKindColor,
  type StaffClassKind,
  useAdminClassKinds,
  useAdminStaff,
  useAdminUnits,
  useCreateStaff,
  useUpdateStaff,
} from '@/api/admin';
import { InstructorPhotoUpload } from '@/components/admin/instructor-photo-upload';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import {
  Drawer,
  FormField,
  Select,
  TextArea,
  TextInput,
} from '@/components/admin/drawer';

interface AdminInstructorsProps {
  /// Default unit (fallback). Tab can switch arenas internally.
  unitId: string | undefined;
}

type FilterStatus = 'all' | 'active' | 'inactive';

const COLOR_PALETTE: Record<
  ClassKindColor,
  { bg: string; fg: string; soft: string; softFg: string }
> = {
  CLAY: {
    bg: 'var(--color-clay)',
    fg: 'var(--color-cream)',
    soft: '#F1D6CA',
    softFg: 'var(--color-clay-d)',
  },
  SUN: {
    bg: 'var(--color-sun)',
    fg: 'var(--color-ink)',
    soft: '#F4E8C9',
    softFg: '#735517',
  },
  SEA: {
    bg: 'var(--color-sea)',
    fg: 'var(--color-cream)',
    soft: '#CFE0E0',
    softFg: 'var(--color-sea-d)',
  },
  SAND: {
    bg: 'var(--color-sand-2)',
    fg: 'var(--color-ink)',
    soft: 'var(--color-cream-2)',
    softFg: 'var(--color-ink-2)',
  },
  INK: {
    bg: 'var(--color-ink)',
    fg: 'var(--color-cream)',
    soft: '#3a3128',
    softFg: 'var(--color-cream)',
  },
  GREEN: {
    bg: 'var(--color-success)',
    fg: 'var(--color-cream)',
    soft: '#E5EFE3',
    softFg: '#3F7A4F',
  },
};

function paletteOf(token: ClassKindColor | undefined | null) {
  return COLOR_PALETTE[token ?? 'SEA'] ?? COLOR_PALETTE.SEA;
}

export function AdminInstructors({ unitId }: AdminInstructorsProps) {
  // 2026-05 — arena context comes from the sidebar selector. The internal
  // tab strip was removed; this tab simply scopes its staff query to the
  // currently-selected arena. The form lets the admin assign an
  // instructor to multiple arenas via M2M.
  const unitsQ = useAdminUnits(false);
  const staffQ = useAdminStaff({
    role: 'INSTRUCTOR',
    unitId: unitId ?? undefined,
  });
  const [editing, setEditing] = useState<AdminStaff | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = staffQ.data ?? [];
    return list.filter((s) => {
      if (filter === 'active' && !s.isActive) return false;
      if (filter === 'inactive' && s.isActive) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.email.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [staffQ.data, filter, search]);

  return (
    <div className="fadein">
      <PageHead
        eyebrow="time"
        title={
          <>
            professores
            <br />
            <span className="font-normal italic text-ink-2">da casa.</span>
          </>
        }
        sub="Cadastre instrutores com login próprio. Cada um tem um carro-chefe (tipo de aula que melhor representa) e pode ministrar todas as modalidades cadastradas."
        actions={<Btn tone="clay" onClick={() => setCreating(true)}>novo professor</Btn>}
      />

      {/* 2026-05 — internal arena tab strip replaced by the sidebar
          selector. Tab automatically scopes to the selected arena. */}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nome ou e-mail"
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
              {f === 'all' ? 'todos' : f === 'active' ? 'ativos' : 'afastados'}
            </button>
          ))}
        </div>
      </div>

      {staffQ.isLoading ? (
        <div className="text-ink-2">Carregando...</div>
      ) : staffQ.isError ? (
        <div className="text-clay-d">Erro ao carregar professores.</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="display-tight text-[22px]">
            {staffQ.data?.length === 0
              ? 'nenhum professor ainda'
              : 'sem resultados'}
          </div>
          <div className="mt-2 text-sm text-ink-2">
            {staffQ.data?.length === 0
              ? 'Cadastre o primeiro instrutor para começar a abrir aulas.'
              : 'Tente outro filtro ou termo de busca.'}
          </div>
          {staffQ.data?.length === 0 && (
            <div className="mt-4 inline-flex">
              <Btn tone="clay" onClick={() => setCreating(true)}>
                cadastrar professor
              </Btn>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((staff) => (
            <InstructorCard
              key={staff.id}
              staff={staff}
              onEdit={() => setEditing(staff)}
            />
          ))}
        </div>
      )}

      <InstructorFormDrawer
        open={creating || !!editing}
        editing={editing}
        units={unitsQ.data ?? []}
        defaultUnitId={unitId ?? null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

interface InstructorCardProps {
  staff: AdminStaff;
  onEdit: () => void;
}

function InstructorCard({ staff, onEdit }: InstructorCardProps) {
  // Mirrors the prototype card layout (Claude Designer admin):
  //   header  → avatar 56px + nome lowercase com sobrenome opaco + esp clay
  //   middle  → 3 mini-stats (semana / total / especialidades)
  //   footer  → status dot+label + "editar" pill button
  const [first, ...rest] = staff.name.split(' ');
  const last = rest.join(' ');
  const initials = `${first?.[0] ?? ''}${rest[0]?.[0] ?? ''}`.toUpperCase();

  // Avatar color derives from the carro-chefe (B2 colorToken) — same call
  // the home and calendar make. Inactive staff fade to cream-2 muted.
  const primaryPalette = paletteOf(staff.primaryClassKind?.colorToken);

  const week = staff.weeklyClasses ?? 0;
  const total = staff.totalClasses ?? 0;
  const specialties = staff.classKinds.length;

  return (
    <article
      className="group flex flex-col gap-3.5 rounded-lg border border-sand bg-cream p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <header className="flex items-center gap-3.5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full text-[18px] font-extrabold"
          style={{
            background: staff.isActive
              ? primaryPalette.bg
              : 'var(--color-cream-2)',
            color: staff.isActive
              ? primaryPalette.fg
              : 'var(--color-ink-2)',
          }}
          aria-hidden
        >
          {initials || '—'}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="display-tight truncate"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            {(first ?? '').toLowerCase()}
            {last && (
              <>
                {' '}
                <span className="font-normal opacity-55">
                  {last.toLowerCase()}
                </span>
              </>
            )}
          </div>
          {staff.primaryClassKind && (
            <div className="mt-1 truncate text-[12px] font-semibold lowercase text-clay">
              {staff.primaryClassKind.name}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1.5 border-y border-sand py-3.5">
        <Stat label="semana" value={week} />
        <Stat label="total" value={total} />
        <Stat
          label={specialties === 1 ? 'tipo' : 'tipos'}
          value={specialties}
        />
      </div>

      {staff.bio && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">
          {staff.bio}
        </p>
      )}

      {staff.classKinds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {staff.classKinds.map((k) => (
            <ColoredKindPill
              key={k.id}
              kind={k}
              isPrimary={k.id === staff.primaryClassKindId}
            />
          ))}
        </div>
      )}

      {staff.arenas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold uppercase tracking-wide text-ink-2">
            arenas
          </span>
          {staff.arenas.map((a) => (
            <span
              key={a.id}
              className="rounded-full bg-cream-2 px-2.5 py-0.5 font-semibold text-ink"
            >
              {a.name.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {staff.mustChangePassword && (
        <div className="rounded-xs bg-[#F4E8C9] px-2.5 py-1.5 text-[11px] font-medium text-[#735517]">
          aguardando primeira troca de senha
        </div>
      )}

      <footer className="flex items-center justify-between gap-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
          style={{
            color: staff.isActive
              ? 'var(--color-success)'
              : 'var(--color-ink-2)',
          }}
        >
          <span
            className="size-2 rounded-full"
            style={{
              background: staff.isActive
                ? 'var(--color-success)'
                : 'var(--color-ink-2)',
            }}
            aria-hidden
          />
          {staff.isActive ? 'ativa na escala' : 'afastado'}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-cream transition-colors hover:bg-ink-2"
        >
          <PencilIcon /> editar
        </button>
      </footer>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <span
        className="display-tight mono"
        style={{ fontSize: 22, marginTop: 2 }}
      >
        {value}
      </span>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ColoredKindPill({
  kind,
  isPrimary,
}: {
  kind: StaffClassKind;
  isPrimary: boolean;
}) {
  const palette = paletteOf(kind.colorToken);
  if (isPrimary) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
        style={{ background: palette.bg, color: palette.fg }}
      >
        <StarIcon size={10} />
        {kind.name}
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: palette.soft, color: palette.softFg }}
    >
      {kind.name}
    </span>
  );
}

interface InstructorFormDrawerProps {
  open: boolean;
  editing: AdminStaff | null;
  units: AdminUnit[];
  defaultUnitId: string | null;
  onClose: () => void;
}

function InstructorFormDrawer({
  open,
  editing,
  units,
  defaultUnitId,
  onClose,
}: InstructorFormDrawerProps) {
  const kindsQ = useAdminClassKinds();
  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  // 2026-05 — multi-arena: instructor pode lecionar em 1+ arenas. Carrega
  // do `editing.arenas[]` (canonical source pra INSTRUCTOR), com fallback
  // pro `defaultUnitId` no fluxo de criação.
  const [arenaIds, setArenaIds] = useState<string[]>([]);
  const [primaryKindId, setPrimaryKindId] = useState<string>('');
  const [classKindIds, setClassKindIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setEmail(editing?.email ?? '');
    setPassword('');
    setBio(editing?.bio ?? '');
    setArenaIds(
      editing
        ? editing.arenas.map((a) => a.id)
        : defaultUnitId
          ? [defaultUnitId]
          : [],
    );
    setPrimaryKindId(editing?.primaryClassKindId ?? '');
    setClassKindIds(editing?.classKinds.map((k) => k.id) ?? []);
    setIsActive(editing?.isActive ?? true);
    setError(null);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultUnitId]);

  // 15.3 — primary kind must be in the specialty set. Auto-add when missing
  // so the admin doesn't have to remember to also tick the checkbox.
  useEffect(() => {
    if (!primaryKindId) return;
    setClassKindIds((prev) =>
      prev.includes(primaryKindId) ? prev : [...prev, primaryKindId],
    );
  }, [primaryKindId]);

  const isPending = createMut.isPending || updateMut.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!editing && !email.trim()) return setError('E-mail é obrigatório.');
    if (!editing && password.length < 8)
      return setError('Senha temporária precisa de 8+ caracteres.');
    if (password && password.length < 8)
      return setError('Nova senha precisa de 8+ caracteres.');
    if (arenaIds.length === 0)
      return setError('Escolha pelo menos uma arena onde o professor leciona.');
    // 15.3 — bio mandatory.
    if (!bio.trim())
      return setError('Descrição é obrigatória — aparece no perfil público.');
    if (!primaryKindId)
      return setError('Escolha o carro-chefe (tipo de aula principal).');

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          name: name.trim(),
          bio: bio.trim(),
          unitIds: arenaIds,
          classKindIds,
          primaryClassKindId: primaryKindId,
          isActive,
          ...(password ? { password } : {}),
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'INSTRUCTOR',
          unitIds: arenaIds,
          bio: bio.trim(),
          classKindIds,
          primaryClassKindId: primaryKindId,
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar professor.');
    }
  };

  const toggleArena = (id: string) => {
    setArenaIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const toggleKind = (id: string) => {
    if (id === primaryKindId) return; // can't remove the carro-chefe
    setClassKindIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const kinds = (kindsQ.data ?? []).filter((k) => k.isActive);

  return (
    <Drawer
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={editing ? 'editar professor' : 'novo professor'}
      subtitle={
        editing
          ? 'Mudanças em senha forçam nova troca no próximo login.'
          : 'O professor recebe uma senha temporária e troca no primeiro acesso.'
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
                : 'cadastrar professor'}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="nome completo">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marina Vasques"
            maxLength={120}
          />
        </FormField>

        <FormField
          label="e-mail"
          hint={
            editing
              ? 'O e-mail não pode ser alterado depois do cadastro.'
              : 'usado para login do professor'
          }
        >
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marina@bikebeach.com.br"
            disabled={!!editing}
          />
        </FormField>

        <FormField
          label={editing ? 'redefinir senha' : 'senha temporária'}
          hint={
            editing
              ? 'Deixe em branco para manter a senha atual.'
              : 'Mín. 8 caracteres. O professor troca no primeiro acesso.'
          }
        >
          <TextInput
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              editing ? 'nova senha (opcional)' : 'mínimo 8 caracteres'
            }
            autoComplete="new-password"
          />
        </FormField>

        <FormField
          label="arenas"
          hint={
            units.length === 0
              ? 'Cadastre uma arena na aba "arenas" antes de continuar.'
              : 'um professor pode dar aula em uma ou mais arenas — toque pra adicionar/remover.'
          }
        >
          {units.length === 0 ? (
            <div className="rounded-xs bg-cream-2 px-4 py-3 text-sm text-ink-2">
              sem arenas cadastradas.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {units.map((u) => {
                const selected = arenaIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleArena(u.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                      selected
                        ? 'bg-clay text-cream'
                        : 'bg-cream-2 text-ink-2 hover:bg-sand'
                    }`}
                  >
                    {selected && <CheckIcon size={10} />}
                    {u.name}
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField
          label="descrição"
          hint="obrigatório — aparece no card da home e no perfil do professor."
        >
          <TextArea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Sunset specialist. Treina pedalada cadenciada com beats funk-soul."
          />
        </FormField>

        {editing && <InstructorPhotoUpload instructor={editing} />}

        <FormField
          label="carro-chefe"
          hint={
            kinds.length === 0
              ? 'Nenhum tipo de aula cadastrado — abra a aba "tipos de aula" antes.'
              : 'tipo de aula que melhor representa o professor. Aparece em destaque na home.'
          }
        >
          <Select
            value={primaryKindId}
            onChange={(e) => setPrimaryKindId(e.target.value)}
            disabled={kinds.length === 0}
          >
            <option value="">selecionar...</option>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="também pode dar"
          hint="todas as outras aulas que o professor está habilitado. O carro-chefe entra automaticamente."
        >
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((kind) => {
              const selected = classKindIds.includes(kind.id);
              const isPrimary = kind.id === primaryKindId;
              const palette = paletteOf(kind.colorToken);
              const lockedToPrimary = isPrimary;
              return (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => toggleKind(kind.id)}
                  disabled={lockedToPrimary}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed"
                  style={
                    selected
                      ? { background: palette.bg, color: palette.fg }
                      : {
                          background: 'var(--color-cream-2)',
                          color: 'var(--color-ink-2)',
                        }
                  }
                  title={
                    lockedToPrimary
                      ? 'O carro-chefe sempre entra na lista.'
                      : ''
                  }
                >
                  {isPrimary && <StarIcon size={10} />}
                  {kind.name}
                </button>
              );
            })}
          </div>
        </FormField>

        {editing && (
          <FormField label="status">
            <div className="flex gap-1.5">
              <StatusToggle
                label="ativo"
                active={isActive}
                onClick={() => setIsActive(true)}
              />
              <StatusToggle
                label="afastado"
                active={!isActive}
                onClick={() => setIsActive(false)}
              />
            </div>
          </FormField>
        )}

        {error && (
          <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            {error}
          </div>
        )}
      </form>
    </Drawer>
  );
}

function StatusToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${
        active
          ? 'bg-ink text-cream'
          : 'bg-cream-2 text-ink-2 ring-1 ring-sand hover:bg-sand'
      }`}
    >
      {label}
    </button>
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}
