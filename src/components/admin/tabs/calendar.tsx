import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  type AdminClassSlot,
  type AdminStaff,
  type AdminUnit,
  type ClassKindColor,
  type StudioCancelReason,
  useAdminClassKinds,
  useAdminClassSlots,
  useAdminStaff,
  useAdminUnits,
  useCancelClassSlot,
  useCreateClassSlot,
  useUpdateClassSlot,
} from '@/api/admin';
import { Btn, Card, PageHead } from '@/components/admin/ui';
import {
  Drawer,
  FormField,
  Select,
  TextInput,
} from '@/components/admin/drawer';
// `InputNumber` no longer used here — duration + capacity são read-only
// no drawer (item-10).

interface AdminCalendarProps {
  unitId: string | undefined;
}

type StatusFilter = 'all' | 'scheduled' | 'cancelled';

const DAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function AdminCalendar({ unitId }: AdminCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminClassSlot | null>(null);
  const [creating, setCreating] = useState<{ day: Date } | null>(null);

  const fromIso = weekStart.toISOString();
  const toIso = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end.toISOString();
  }, [weekStart]);

  const shiftWeek = (delta: number) => {
    setWeekStart((prev) => {
      const x = new Date(prev);
      x.setDate(x.getDate() + delta);
      return x;
    });
  };

  const slotsQ = useAdminClassSlots(unitId, fromIso, toIso);
  const instructorsQ = useAdminStaff({ role: 'INSTRUCTOR', unitId });
  const kindsQ = useAdminClassKinds();
  const unitsQ = useAdminUnits(false);
  const activeUnit =
    unitsQ.data?.find((u) => u.id === unitId) ?? null;

  const filteredSlots = useMemo(() => {
    const list = slotsQ.data ?? [];
    return list.filter((s) => {
      if (instructorFilter !== 'all' && s.instructorId !== instructorFilter)
        return false;
      if (statusFilter === 'scheduled' && s.status !== 'SCHEDULED')
        return false;
      if (
        statusFilter === 'cancelled' &&
        s.status !== 'CANCELLED_BEFORE' &&
        s.status !== 'CANCELLED_DURING'
      )
        return false;
      return true;
    });
  }, [slotsQ.data, instructorFilter, statusFilter]);

  // Time rows derived from visible slots — keeps the grid honest about what's
  // actually scheduled instead of forcing a fixed pattern.
  const timeRows = useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredSlots) set.add(toHHMM(new Date(s.startsAt)));
    return Array.from(set).sort();
  }, [filteredSlots]);

  // Group by `${dayIndex}-${HH:MM}`.
  const grid = useMemo(() => {
    const g = new Map<string, AdminClassSlot[]>();
    for (const s of filteredSlots) {
      const d = new Date(s.startsAt);
      const dayIdx = dayIndexFromMonday(d);
      const key = `${dayIdx}-${toHHMM(d)}`;
      const list = g.get(key) ?? [];
      list.push(s);
      g.set(key, list);
    }
    return g;
  }, [filteredSlots]);

  const days = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, [weekStart]);

  const range = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <div className="fadein">
      <PageHead
        eyebrow="grade da semana"
        title={
          <>
            calendário
            <br />
            <span className="font-normal italic text-ink-2">{range}.</span>
          </>
        }
        sub="Clique em qualquer célula vazia para criar uma aula. Clique numa aula existente para editar ou cancelar."
        actions={
          <>
            <Btn ghost onClick={() => shiftWeek(-7)}>
              ← anterior
            </Btn>
            <Btn ghost onClick={() => setWeekStart(startOfWeek(new Date()))}>
              esta semana
            </Btn>
            <Btn ghost onClick={() => shiftWeek(7)}>
              próxima →
            </Btn>
            <Btn
              tone="clay"
              onClick={() =>
                setCreating({
                  // Prefill with the week's first day, but never a past
                  // day (the form blocks past creation anyway).
                  day:
                    days[0] && !isPastDay(days[0]) ? days[0] : new Date(),
                })
              }
            >
              nova aula
            </Btn>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select
          value={instructorFilter}
          onChange={(e) => setInstructorFilter(e.target.value)}
          className="max-w-[260px]"
        >
          <option value="all">todos os professores</option>
          {(instructorsQ.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-1.5">
          {(['all', 'scheduled', 'cancelled'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                statusFilter === f
                  ? 'bg-ink text-cream'
                  : 'bg-cream-2 text-ink-2 hover:bg-sand'
              }`}
            >
              {f === 'all'
                ? 'todas'
                : f === 'scheduled'
                  ? 'agendadas'
                  : 'canceladas'}
            </button>
          ))}
        </div>
      </div>

      {slotsQ.isLoading ? (
        <div className="text-ink-2">Carregando...</div>
      ) : (
        <Card className="overflow-x-auto p-4">
          <CalendarGrid
            days={days}
            timeRows={timeRows}
            grid={grid}
            onCreate={(day, hhmm) => setCreating({ day: withTime(day, hhmm) })}
            onEdit={setEditing}
          />
          {timeRows.length === 0 && (
            <div className="mt-4 rounded-xs border border-dashed border-sand-2 bg-cream-2 px-4 py-6 text-center text-sm text-ink-2">
              Sem aulas nesta semana. Clique no <span className="mono">+</span>{' '}
              de qualquer dia para abrir o formulário.
            </div>
          )}
        </Card>
      )}

      <SlotFormDrawer
        open={!!creating || !!editing}
        editing={editing}
        prefillDay={creating?.day ?? null}
        unit={activeUnit}
        instructors={instructorsQ.data ?? []}
        kinds={kindsQ.data ?? []}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
      />
    </div>
  );
}

interface CalendarGridProps {
  days: Date[];
  timeRows: string[];
  grid: Map<string, AdminClassSlot[]>;
  onCreate: (day: Date, hhmm: string) => void;
  onEdit: (slot: AdminClassSlot) => void;
}

function CalendarGrid({
  days,
  timeRows,
  grid,
  onCreate,
  onEdit,
}: CalendarGridProps) {
  // Always show at least a "+ slot" row so admin can create when empty.
  const rows = timeRows.length ? timeRows : ['—'];

  return (
    <div
      className="min-w-[920px] grid gap-1.5"
      style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}
    >
      <div />
      {days.map((d, i) => {
        const isToday = isSameDate(d, new Date());
        return (
          <div
            key={i}
            className={`px-2 py-2.5 text-center ${
              isToday ? 'bg-cream-2 rounded-xs' : ''
            }`}
          >
            <div className="display-tight text-[18px] leading-none">
              {DAY_LABELS[i]}
            </div>
            <div className="mt-1 text-[11px] text-ink-2">
              {d.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })}
            </div>
          </div>
        );
      })}

      {rows.map((hhmm) => (
        <FragmentRow
          key={hhmm}
          hhmm={hhmm}
          days={days}
          grid={grid}
          onCreate={onCreate}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

interface FragmentRowProps {
  hhmm: string;
  days: Date[];
  grid: Map<string, AdminClassSlot[]>;
  onCreate: (day: Date, hhmm: string) => void;
  onEdit: (slot: AdminClassSlot) => void;
}

function FragmentRow({
  hhmm,
  days,
  grid,
  onCreate,
  onEdit,
}: FragmentRowProps) {
  return (
    <>
      <div className="mono flex items-center justify-end pr-2 text-[12px] font-semibold text-ink-2">
        {hhmm === '—' ? '' : hhmm}
      </div>
      {days.map((d, di) => {
        const key = `${di}-${hhmm}`;
        const slots = grid.get(key) ?? [];
        if (slots.length === 0) {
          // Past days can't take new classes (backend requires a future
          // start). Render an inert, muted cell instead of the + button.
          if (isPastDay(d)) {
            return (
              <div
                key={di}
                aria-hidden
                className="min-h-[58px] rounded-xs border border-dashed border-sand/40 bg-cream-2/20"
              />
            );
          }
          return (
            <button
              key={di}
              type="button"
              onClick={() => onCreate(d, hhmm === '—' ? '07:00' : hhmm)}
              className="group flex min-h-[58px] items-center justify-center rounded-xs border border-dashed border-sand bg-cream-2/40 text-ink-3 transition-colors hover:border-clay hover:bg-cream"
              title="Criar aula neste dia"
            >
              <span className="text-lg leading-none opacity-50 group-hover:opacity-100">
                +
              </span>
            </button>
          );
        }
        return (
          <div key={di} className="flex flex-col gap-1">
            {slots.map((s) => (
              <SlotChip key={s.id} slot={s} onClick={() => onEdit(s)} />
            ))}
          </div>
        );
      })}
    </>
  );
}

function SlotChip({
  slot,
  onClick,
}: {
  slot: AdminClassSlot;
  onClick: () => void;
}) {
  const colorToken = slot.classKind?.colorToken ?? 'SEA';
  const isCancelled =
    slot.status === 'CANCELLED_BEFORE' || slot.status === 'CANCELLED_DURING';
  const isCompleted = slot.status === 'COMPLETED';
  const lotacaoPct = slot.capacity
    ? Math.round((slot.reservedCount / slot.capacity) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xs px-2.5 py-2 text-left transition-transform hover:-translate-y-px ${
        isCancelled || isCompleted ? 'opacity-70' : ''
      }`}
      style={{
        background: colorTokenBg(colorToken),
        color: colorTokenFg(colorToken),
      }}
    >
      <div className="display-tight text-[15px] leading-tight">
        {slot.classKind?.name ?? slot.title ?? 'aula'}
      </div>
      <div className="mt-0.5 truncate text-[11px] opacity-90">
        {slot.instructor.name}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
        {isCompleted ? (
          <>
            <span>concluída</span>
            <span className="mono">
              {slot.presentCount} {slot.presentCount === 1 ? 'presente' : 'presentes'}
            </span>
          </>
        ) : isCancelled ? (
          <>
            <span>cancelada</span>
            <span />
          </>
        ) : (
          <>
            <span className="mono">
              {slot.reservedCount}/{slot.capacity}
            </span>
            <span />
          </>
        )}
      </div>
      {!isCancelled && !isCompleted && (
        <div className="mt-1 h-1 w-full rounded-full bg-black/15">
          <div
            className="h-full rounded-full bg-current"
            style={{ width: `${Math.min(100, lotacaoPct)}%` }}
          />
        </div>
      )}
    </button>
  );
}

const COLOR_TOKEN_PALETTE: Record<
  ClassKindColor,
  { bg: string; fg: string }
> = {
  CLAY: { bg: 'var(--color-clay)', fg: 'var(--color-cream)' },
  SUN: { bg: 'var(--color-sun)', fg: 'var(--color-ink)' },
  SEA: { bg: 'var(--color-sea)', fg: 'var(--color-cream)' },
  SAND: { bg: 'var(--color-sand-2)', fg: 'var(--color-ink)' },
  INK: { bg: 'var(--color-ink)', fg: 'var(--color-cream)' },
  GREEN: { bg: 'var(--color-success)', fg: 'var(--color-cream)' },
};

function colorTokenBg(token: ClassKindColor) {
  return COLOR_TOKEN_PALETTE[token]?.bg ?? COLOR_TOKEN_PALETTE.SEA.bg;
}

function colorTokenFg(token: ClassKindColor) {
  return COLOR_TOKEN_PALETTE[token]?.fg ?? COLOR_TOKEN_PALETTE.SEA.fg;
}

// ============================================================================
// Slot form drawer
// ============================================================================

interface SlotFormDrawerProps {
  open: boolean;
  editing: AdminClassSlot | null;
  prefillDay: Date | null;
  unit: AdminUnit | null;
  instructors: AdminStaff[];
  kinds: { id: string; slug: string; name: string; defaultDurationMinutes: number; isActive: boolean }[];
  onClose: () => void;
}

function SlotFormDrawer({
  open,
  editing,
  prefillDay,
  unit,
  instructors,
  kinds,
  onClose,
}: SlotFormDrawerProps) {
  const createMut = useCreateClassSlot();
  const updateMut = useUpdateClassSlot();
  const cancelMut = useCancelClassSlot();

  const [instructorId, setInstructorId] = useState('');
  const [classKindId, setClassKindId] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  // 2026-05 — esses dois state continuam como `number` puro porque a
  // UI do drawer mostra read-only. Sem InputNumber → sem null.
  const [duration, setDuration] = useState<number>(45);
  const [capacity, setCapacity] = useState<number>(32);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState<StudioCancelReason>('CHUVA');
  const [cancelDescription, setCancelDescription] = useState('');

  // Reset form whenever the drawer opens for a different target.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const d = new Date(editing.startsAt);
      setInstructorId(editing.instructorId);
      setClassKindId(editing.classKindId ?? '');
      setTitle(editing.title ?? '');
      setTitleTouched(true); // existing title is "user-set" — don't auto-fill over it
      setDate(toDateInput(d));
      setTime(toHHMM(d));
      setDuration(editing.durationMinutes);
      setCapacity(editing.capacity);
    } else if (prefillDay) {
      setInstructorId(instructors[0]?.id ?? '');
      setClassKindId('');
      setTitle('');
      setTitleTouched(false);
      setDate(toDateInput(prefillDay));
      setTime(toHHMM(prefillDay));
      setDuration(45);
      // 2026-05 — capacity is now derived from the arena's bike count
      // server-side. This local state is purely informational; the value
      // is no longer sent in the create payload.
      setCapacity(unit?.operationalBikeCount ?? 0);
    }
    setError(null);
    setConfirmCancel(false);
    setCancelReason('CHUVA');
    setCancelDescription('');
    createMut.reset();
    updateMut.reset();
    cancelMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, prefillDay?.toISOString(), unit?.id]);

  // 2026-05 (item-10) — duração SEMPRE herda do classKind, sem override.
  // Aplicamos no create + no edit. O setDuration aqui mantém o valor
  // visível no chip read-only consistente.
  useEffect(() => {
    if (!classKindId) return;
    const kind = kinds.find((k) => k.id === classKindId);
    if (kind) setDuration(kind.defaultDurationMinutes);
  }, [classKindId, kinds]);

  // 14.4 — auto-fill the title with `${kind.name.toLowerCase()} com ${first}`
  // until the user types something. Editing's existing title is preserved
  // because `titleTouched` starts true in that branch.
  useEffect(() => {
    if (titleTouched) return;
    if (!classKindId || !instructorId) return;
    const kind = kinds.find((k) => k.id === classKindId);
    const inst = instructors.find((i) => i.id === instructorId);
    if (!kind || !inst) return;
    // Title is auto-generated as "kind com Nome" — instructor first name in
    // Title Case so the display rule from item-2 holds even when the title
    // is later rendered raw (slot.title overrides classKind.name).
    const raw = inst.name.trim().split(/\s+/)[0] ?? '';
    const first = raw ? raw[0]!.toUpperCase() + raw.slice(1).toLowerCase() : '';
    setTitle(`${kind.name.toLowerCase()} com ${first}`.trim());
  }, [classKindId, instructorId, titleTouched, kinds, instructors]);

  // 14.3 — show ALL active kinds, regardless of instructor specialty. The
  // "carro chefe" stays visible on the instructor card only.
  const visibleKinds = useMemo(
    () => kinds.filter((k) => k.isActive),
    [kinds],
  );

  const isPending =
    createMut.isPending || updateMut.isPending || cancelMut.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!unit) return setError('Arena não carregada.');
    // 2026-05 (item-10) — validações refeitas: kind + professor + data +
    // horário são obrigatórios. Duração herda do kind, capacidade da
    // arena (bikes operacionais), título é auto-gerado.
    if (!classKindId)
      return setError('Selecione o tipo de aula — define a duração.');
    if (!instructorId) return setError('Selecione o professor.');
    if (!date) return setError('Selecione a data.');
    if (!time) return setError('Selecione o horário.');
    const startsAt = combineDateTime(date, time);
    if (Number.isNaN(startsAt.getTime())) return setError('Data/hora inválida.');
    if (!editing && startsAt.getTime() <= Date.now())
      return setError('A aula precisa começar no futuro.');
    if (!editing && (!unit.operationalBikeCount || unit.operationalBikeCount < 1)) {
      return setError(
        'Arena sem bikes operacionais — cadastre bikes antes de abrir aulas.',
      );
    }

    try {
      if (editing) {
        // Update keeps the legacy capacity field for backwards-compat —
        // it doesn't auto-derive on update (the slot's capacity was set
        // at creation time). instructorId só vai pro backend quando muda
        // — backend valida arena assignment + role e exige ADMIN.
        await updateMut.mutateAsync({
          id: editing.id,
          instructorId:
            instructorId !== editing.instructorId ? instructorId : undefined,
          classKindId: classKindId || undefined,
          title: title.trim() || undefined,
          startsAt: startsAt.toISOString(),
          durationMinutes: duration,
          capacity,
        });
      } else {
        // 2026-05 — capacity is auto-derived server-side from the
        // operational bike count of the arena. Don't send it.
        await createMut.mutateAsync({
          unitId: unit.id,
          instructorId,
          classKindId: classKindId || undefined,
          title: title.trim() || undefined,
          startsAt: startsAt.toISOString(),
          durationMinutes: duration,
        });
      }
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao salvar aula.');
    }
  };

  const cancelSlot = async () => {
    if (!editing) return;
    setError(null);
    try {
      await cancelMut.mutateAsync({
        id: editing.id,
        kind: 'STUDIO',
        studioReason: cancelReason,
        description: cancelDescription.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(extractMessage(err) ?? 'Falha ao cancelar aula.');
    }
  };

  const isCancelled =
    editing?.status === 'CANCELLED_BEFORE' ||
    editing?.status === 'CANCELLED_DURING';

  return (
    <Drawer
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={editing ? 'editar aula' : 'nova aula'}
      subtitle={
        editing
          ? `${editing.reservedCount}/${editing.capacity} reservas — toda mudança notifica os alunos.`
          : 'Preencha tudo. O professor recebe a aula na agenda dele assim que você salvar.'
      }
      footer={
        <>
          <Btn ghost onClick={onClose}>
            cancelar
          </Btn>
          {editing && !isCancelled && (
            <Btn tone="ink" onClick={() => setConfirmCancel(true)}>
              cancelar aula
            </Btn>
          )}
          {!isCancelled && (
            <Btn
              tone="clay"
              onClick={() =>
                submit(new Event('submit') as unknown as FormEvent)
              }
              disabled={isPending}
            >
              {isPending
                ? 'salvando...'
                : editing
                  ? 'salvar alterações'
                  : 'criar aula'}
            </Btn>
          )}
        </>
      }
    >
      {confirmCancel ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
            Cancelar essa aula devolve todos os créditos para os{' '}
            {editing?.reservedCount ?? 0} alunos reservados e marca a aula como
            cancelada no histórico.
          </div>
          <FormField label="motivo">
            <Select
              value={cancelReason}
              onChange={(e) =>
                setCancelReason(e.target.value as StudioCancelReason)
              }
            >
              <option value="CHUVA">chuva</option>
              <option value="VENTO">vento forte</option>
              <option value="RAIO">raio / trovoada</option>
              <option value="MAR_ALTO">mar alto</option>
              <option value="TECNICO">problema técnico</option>
              <option value="MANUTENCAO">manutenção</option>
              <option value="SEGURANCA">segurança</option>
              <option value="BAIXA_ADESAO">baixa adesão</option>
              <option value="OUTRO">outro</option>
            </Select>
          </FormField>
          {cancelReason === 'OUTRO' && (
            <FormField label="descrição" hint="obrigatório quando 'outro'">
              <TextInput
                value={cancelDescription}
                onChange={(e) => setCancelDescription(e.target.value)}
              />
            </FormField>
          )}
          <div className="flex justify-end gap-2.5">
            <Btn ghost onClick={() => setConfirmCancel(false)}>
              voltar
            </Btn>
            <Btn tone="clay" onClick={cancelSlot} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? 'cancelando...' : 'confirmar cancelamento'}
            </Btn>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormField label="professor">
            <Select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
            >
              <option value="">selecionar...</option>
              {instructors
                .filter((i) => i.isActive)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField
            label="tipo de aula"
            hint="todos os tipos disponíveis. Define duração padrão e cor do chip."
          >
            <Select
              value={classKindId}
              onChange={(e) => setClassKindId(e.target.value)}
            >
              <option value="">selecionar...</option>
              {visibleKinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3.5">
            <FormField label="data">
              <TextInput
                type="date"
                value={date}
                min={editing ? undefined : toDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
              />
            </FormField>
            <FormField label="horário">
              <TextInput
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </FormField>
          </div>

          {/*
            2026-05 (item-10) — duração e capacidade ficam visíveis como
            chips read-only pra contexto. Duração vem do tipo escolhido,
            capacidade da arena (count de bikes operacionais). Título não
            é mais editável — backend usa `classKind.name` na renderização.
          */}
          <div className="grid grid-cols-2 gap-3.5">
            <ReadOnlyField
              label="duração · auto"
              value={
                classKindId
                  ? `${duration} min · do tipo de aula`
                  : 'escolha um tipo'
              }
            />
            <ReadOnlyField
              label="capacidade · auto"
              value={
                editing
                  ? `${capacity} bikes (fixada na criação)`
                  : `${unit?.operationalBikeCount ?? 0} bikes da arena`
              }
            />
          </div>

          <div className="rounded-xs bg-cream-2 px-4 py-3 text-[12px] leading-relaxed text-ink-2">
            <b className="text-ink">título da aula</b> é gerado automaticamente
            no formato “tipo com Nome”. Pra mudar, edite o tipo de aula ou o
            nome do professor.
          </div>

          {isCancelled && (
            <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
              Esta aula está cancelada — não dá pra editar.
            </div>
          )}

          {error && (
            <div className="rounded-xs bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
              {error}
            </div>
          )}
        </form>
      )}
    </Drawer>
  );
}

// ============================================================================
// Date helpers
// ============================================================================

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // Monday as week start (getDay 0=Sun, 1=Mon, ..., 6=Sat)
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function dayIndexFromMonday(d: Date) {
  const day = d.getDay(); // 0..6, Sun=0
  return day === 0 ? 6 : day - 1;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/// Date-only "is this day before today" — used to disable class creation
/// on past days (the backend rejects past `startsAt` anyway; this stops
/// the user reaching a guaranteed error).
function isPastDay(d: Date) {
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return a.getTime() < today.getTime();
}

function withTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const x = new Date(day);
  x.setHours(h ?? 7, m ?? 0, 0, 0);
  return x;
}

function combineDateTime(dateStr: string, timeStr: string) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(y, (mo ?? 1) - 1, d, h ?? 0, m ?? 0, 0, 0);
}

function extractMessage(err: unknown): string | null {
  const r = err as { response?: { data?: { message?: string | string[] } } };
  const m = r?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? null;
}

/// Read-only chip used for fields that are derived (duration ← kind,
/// capacity ← arena bikes). Visually distinct from editable inputs so
/// the admin sees at a glance which fields are computed.
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <div className="rounded-xs border-[1.5px] border-sand bg-cream-2 px-3.5 py-3 text-sm text-ink-2">
        {value}
      </div>
    </div>
  );
}
