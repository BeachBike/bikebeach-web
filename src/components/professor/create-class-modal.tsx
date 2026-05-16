import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  useAdminClassKinds,
  useAdminUnits,
  useCreateClassSlot,
  type ClassKindColor,
} from '@/api/admin';
import type { Me } from '@/api/me';

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  me: Me;
  onCreated?: () => void;
}

/// 2026-05 (item-19) — instructor self-creates a class slot via a
/// side-drawer (was a centered modal that overflowed on mobile when the
/// kind list grew). Locked fields:
///   - duration ← class kind's `defaultDurationMinutes`
///   - capacity ← arena's `operationalBikeCount`
///   - title ← auto-generated server-side
/// Arena selector appears when the instructor teaches at 2+ arenas.
export function CreateClassModal({
  open,
  onClose,
  me,
  onCreated,
}: CreateClassModalProps) {
  const kindsQ = useAdminClassKinds();
  const unitsQ = useAdminUnits();
  const createMut = useCreateClassSlot();

  // Multi-arena: the prof picks which arena gets the new slot. When
  // they only have one, it's pre-selected and the chip strip is hidden.
  const myArenaIds = useMemo(
    () =>
      (me.arenas?.length
        ? me.arenas.map((a) => a.id)
        : me.unitId
          ? [me.unitId]
          : []) satisfies string[],
    [me.arenas, me.unitId],
  );
  const myArenas = useMemo(
    () =>
      (unitsQ.data ?? []).filter((u) => myArenaIds.includes(u.id)),
    [unitsQ.data, myArenaIds],
  );

  const [arenaId, setArenaId] = useState<string>('');
  const [classKindId, setClassKindId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('06:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setArenaId(myArenas[0]?.id ?? '');
    setClassKindId('');
    setDate(toDateInput(nextWeekDay()));
    setTime('06:00');
    setError(null);
    createMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myArenas[0]?.id]);

  if (!open) return null;

  const kinds = (kindsQ.data ?? []).filter((k) => k.isActive);
  const pickedKind = kinds.find((k) => k.id === classKindId) ?? null;
  const pickedArena = myArenas.find((u) => u.id === arenaId) ?? null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!arenaId)
      return setError('Selecione a arena onde a aula vai rolar.');
    if (!classKindId)
      return setError('Selecione o tipo de aula — define a duração.');
    if (!date || !time) return setError('Defina data e horário.');
    const startsAt = combineDateTime(date, time);
    if (Number.isNaN(startsAt.getTime()))
      return setError('Data/horário inválidos.');
    if (startsAt.getTime() <= Date.now())
      return setError('A aula precisa começar no futuro.');
    if (
      pickedArena &&
      (!pickedArena.operationalBikeCount ||
        pickedArena.operationalBikeCount < 1)
    ) {
      return setError(
        'Essa arena não tem bikes operacionais. Avise o admin.',
      );
    }

    try {
      await createMut.mutateAsync({
        unitId: arenaId,
        instructorId: me.id,
        classKindId,
        startsAt: startsAt.toISOString(),
      });
      onClose();
      onCreated?.();
    } catch (err) {
      setError(extractMessage(err) ?? 'Não conseguimos criar a aula.');
    }
  };

  return createPortal(
    <div
      onClick={createMut.isPending ? undefined : onClose}
      className="fixed inset-0 z-[400] flex justify-end bg-ink/45 backdrop-blur-sm"
      style={{ animation: 'fadein .25s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[520px] flex-col overflow-hidden bg-cream shadow-2xl"
        style={{ animation: 'slidein-right .35s cubic-bezier(.2,.7,.2,1) both' }}
      >
        {/* Header */}
        <div
          className="px-7 py-6"
          style={{
            background: kindBg(pickedKind?.colorToken),
            color: kindFg(pickedKind?.colorToken),
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide opacity-85">
                nova aula
              </div>
              <div className="display-tight mt-1.5 text-[36px] leading-none">
                {pickedKind?.name ?? 'escolha o tipo'}
              </div>
              <div className="mt-1.5 text-[13px] opacity-85">
                {pickedKind && pickedArena
                  ? `${pickedKind.defaultDurationMinutes} min · ${pickedArena.operationalBikeCount} bikes · pegada ${pickedKind.intensity}/5`
                  : pickedKind
                    ? `${pickedKind.defaultDurationMinutes} min · pegada ${pickedKind.intensity}/5`
                    : 'preencha os campos abaixo'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={createMut.isPending}
              className="rounded-full p-1.5 opacity-80 hover:bg-black/10 hover:opacity-100 disabled:opacity-50"
              aria-label="fechar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6"
        >
          {myArenas.length > 1 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
                arena
              </label>
              <div className="flex flex-wrap gap-1.5">
                {myArenas.map((u) => {
                  const selected = arenaId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setArenaId(u.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                        selected
                          ? 'bg-clay text-cream'
                          : 'bg-cream-2 text-ink-2 hover:bg-sand'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
              tipo de aula
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {kinds.map((k) => {
                const selected = classKindId === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setClassKindId(k.id)}
                    className={`flex items-center gap-2.5 rounded-xs border-[1.5px] px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-ink bg-cream-2'
                        : 'border-sand bg-cream hover:bg-cream-2'
                    }`}
                  >
                    <span
                      className="size-3 shrink-0 rounded-xs"
                      style={{ background: kindBg(k.colorToken) }}
                    />
                    <span className="flex flex-col">
                      <span className="display-tight text-[15px] leading-none">
                        {k.name}
                      </span>
                      <span className="mt-0.5 text-[11px] text-ink-2">
                        {k.defaultDurationMinutes}min · {k.intensity}/5
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="data"
              type="date"
              value={date}
              onChange={setDate}
              min={toDateInput(new Date())}
            />
            <Field
              label="horário"
              type="time"
              value={time}
              onChange={setTime}
            />
          </div>

          {/*
            2026-05 (item-19) — duration + capacity são read-only.
            Duração herda do tipo de aula, capacidade da arena.
          */}
          <div className="grid grid-cols-2 gap-3">
            <ReadOnly
              label="duração · auto"
              value={
                pickedKind
                  ? `${pickedKind.defaultDurationMinutes} min · do tipo`
                  : 'escolha um tipo'
              }
            />
            <ReadOnly
              label="capacidade · auto"
              value={
                pickedArena
                  ? `${pickedArena.operationalBikeCount} bikes`
                  : 'escolha uma arena'
              }
            />
          </div>

          {error && (
            <div className="rounded-lg bg-clay-d/10 px-4 py-3 text-sm text-clay-d">
              {error}
            </div>
          )}
        </form>

        {/* Footer pinned */}
        <div className="flex justify-end gap-2.5 border-t border-sand bg-cream-2 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createMut.isPending}
            className="rounded-full border-[1.5px] border-ink px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            cancelar
          </button>
          <button
            type="button"
            onClick={() => submit(new Event('submit') as unknown as FormEvent)}
            disabled={createMut.isPending}
            className="rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {createMut.isPending ? 'criando...' : 'criar aula'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  min,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-[1.5px] border-sand bg-cream px-3.5 py-3 text-sm font-medium focus:border-ink focus:bg-white focus:outline-none"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.04em] text-ink-2">
        {label}
      </span>
      <div className="rounded-lg border-[1.5px] border-sand bg-cream-2 px-3.5 py-3 text-sm text-ink-2">
        {value}
      </div>
    </div>
  );
}

/// Class-kind color comes from the admin-picked `colorToken` (the design
/// system token), NOT a fuzzy match on the free-text `tone` "vibe" field.
/// Earlier this drawer sniffed `tone` for substrings like "forte"/"pôr",
/// so most kinds fell through to SEA and the picked color never showed.
/// Uses the darker token variants because the header is a large
/// text-bearing surface (same palette as the reservation palco card).
const KIND_BG: Record<ClassKindColor, string> = {
  CLAY: 'var(--color-clay)',
  SUN: 'var(--color-sun-d, #C99449)',
  SEA: 'var(--color-sea)',
  SAND: 'var(--color-sand-d, #BBA683)',
  INK: 'var(--color-ink)',
  GREEN: '#3F7A4F',
};

function kindBg(token: ClassKindColor | null | undefined) {
  return (token && KIND_BG[token]) || 'var(--color-clay)';
}

/// SUN / SAND are light fills → dark text reads better on them; the rest
/// are dark → cream text. Mirrors the palco card's `lightFill` rule.
function kindFg(token: ClassKindColor | null | undefined) {
  return token === 'SUN' || token === 'SAND'
    ? 'var(--color-ink)'
    : 'var(--color-cream)';
}

function nextWeekDay() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
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
