import { useEffect, useMemo, useState } from 'react';
import {
  type AdminBike,
  type AdminUnit,
  useAdminBikes,
  useAdminUnits,
  useCreateBike,
  useDeleteBike,
  useUpdateBike,
  useUpdateUnit,
} from '@/api/admin';
import { Btn, PageHead } from '@/components/admin/ui';
import {
  ConfirmModal,
  DoubleConsentModal,
  InputNumber,
} from '@/components/common';

interface AdminBikesProps {
  /// The selected arena from the sidebar context. The tab is fully
  /// driven by this — no internal arena selector anymore (item-15).
  unitId: string | undefined;
}

type BikeStatus = AdminBike['status'];

const STATUS_META: Record<
  BikeStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  OPERATIONAL: {
    label: 'em linha',
    color: 'text-[#3F7A4F]',
    bg: 'bg-[#E5EFE3]',
    dot: 'bg-[#3F7A4F]',
  },
  MAINTENANCE: {
    label: 'manutenção',
    color: 'text-[#735517]',
    bg: 'bg-[#F4E8C9]',
    dot: 'bg-warning',
  },
  OUT_OF_SERVICE: {
    label: 'fora',
    color: 'text-clay-d',
    bg: 'bg-[#F1D6CA]',
    dot: 'bg-clay',
  },
};

const STATUS_ORDER: BikeStatus[] = [
  'OPERATIONAL',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
];

const ROW_LETTERS = 'ABCDEFGHIJ'.split('');

export function AdminBikes({ unitId }: AdminBikesProps) {
  const unitsQ = useAdminUnits(false);
  const activeUnit =
    unitsQ.data?.find((u) => u.id === unitId) ?? null;

  if (unitsQ.isLoading) {
    return <div className="text-ink-2">Carregando arenas...</div>;
  }
  if (!unitsQ.data?.length) {
    return (
      <div className="rounded-lg border border-dashed border-sand-2 bg-cream-2 p-10 text-center">
        <div className="display-tight text-[22px]">sem arenas ainda</div>
        <div className="mt-2 text-sm text-ink-2">
          Cadastre uma arena na aba "arenas" antes de gerenciar bikes.
        </div>
      </div>
    );
  }
  if (!activeUnit) {
    return (
      <div className="rounded-lg border border-dashed border-sand-2 bg-cream-2 p-10 text-center">
        <div className="display-tight text-[22px]">arena não encontrada</div>
        <div className="mt-2 text-sm text-ink-2">
          Selecione uma arena ativa no menu lateral.
        </div>
      </div>
    );
  }

  return (
    <div className="fadein">
      <PageHead
        eyebrow={`frota · ${activeUnit.name.toLowerCase()}`}
        title={
          <>
            bikes,
            <br />
            <span className="font-normal italic text-ink-2">por arena.</span>
          </>
        }
        sub="Toque numa célula vazia pra cadastrar uma bike — o label vai pra A1, A2, etc. Pra excluir ou trocar status, abra os detalhes na lateral."
      />

      <ArenaLayoutEditor key={activeUnit.id} unit={activeUnit} />
    </div>
  );
}

/// Inline editor for `unit.maxRows` / `unit.maxCols`. The admin picks the
/// grid bounds here (2..10 × 2..12, item-15) — the bikes tab is the
/// natural home since the layout is a bike-management concern.
function LayoutControls({ unit }: { unit: AdminUnit }) {
  const updateMut = useUpdateUnit();
  const [rows, setRows] = useState<number | null>(unit.maxRows);
  const [cols, setCols] = useState<number | null>(unit.maxCols);
  const [busy, setBusy] = useState(false);

  // Sync local state when the user switches arenas.
  useEffect(() => {
    setRows(unit.maxRows);
    setCols(unit.maxCols);
  }, [unit.id, unit.maxRows, unit.maxCols]);

  const dirty = rows !== unit.maxRows || cols !== unit.maxCols;

  const save = async () => {
    if (rows == null || cols == null) return;
    setBusy(true);
    try {
      await updateMut.mutateAsync({ id: unit.id, maxRows: rows, maxCols: cols });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-sand bg-cream-2 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
          fileiras
        </span>
        <div className="mt-1 w-[72px]">
          <InputNumber value={rows} onChange={setRows} min={2} max={10} />
        </div>
      </div>
      <span className="pb-3 text-[14px] text-ink-2">×</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
          colunas
        </span>
        <div className="mt-1 w-[72px]">
          <InputNumber value={cols} onChange={setCols} min={2} max={12} />
        </div>
      </div>
      <div className="flex flex-col text-[12px] text-ink-2">
        <span>= {(rows ?? 0) * (cols ?? 0)} posições no grid</span>
        <span>{unit.operationalBikeCount} bikes operacionais hoje</span>
      </div>
      <div className="ml-auto">
        <Btn tone="clay" onClick={save} disabled={!dirty || busy}>
          {busy ? 'salvando…' : 'aplicar grade'}
        </Btn>
      </div>
    </div>
  );
}

function ArenaLayoutEditor({ unit }: { unit: AdminUnit }) {
  const bikesQ = useAdminBikes(unit.id);
  const updateMut = useUpdateBike();
  const createMut = useCreateBike();
  const deleteMut = useDeleteBike();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BikeStatus | 'all'>('all');
  const [pendingCreate, setPendingCreate] = useState<{
    row: string;
    col: number;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminBike | null>(null);

  const bikes = bikesQ.data ?? [];

  // Index bikes by (row, col) for O(1) cell lookup. Unplaced bikes (null
  // row/col) end up in a separate tray for legacy data.
  const cellMap = useMemo(() => {
    const m = new Map<string, AdminBike>();
    for (const b of bikes) {
      if (b.row && b.col) m.set(`${b.row}:${b.col}`, b);
    }
    return m;
  }, [bikes]);

  const unplaced = useMemo(
    () => bikes.filter((b) => !b.row || !b.col),
    [bikes],
  );

  const counts = useMemo(() => {
    const c: Record<BikeStatus, number> = {
      OPERATIONAL: 0,
      MAINTENANCE: 0,
      OUT_OF_SERVICE: 0,
    };
    for (const b of bikes) c[b.status]++;
    return c;
  }, [bikes]);

  const selected = bikes.find((b) => b.id === selectedId) ?? null;

  // 2026-05 (item-15) — auto-derive label from (row, col). Admin doesn't
  // type a label anymore; the system uses `${row}${col}` (A1, B7, etc).
  const handleCellClick = (row: string, col: number) => {
    const occupant = cellMap.get(`${row}:${col}`);
    if (occupant) {
      setSelectedId(occupant.id === selectedId ? null : occupant.id);
    } else {
      setPendingCreate({ row, col });
    }
  };

  const handleUnplacedClick = (bike: AdminBike) => {
    if (selectedId === bike.id) {
      setSelectedId(null);
    } else {
      setSelectedId(bike.id);
    }
  };

  const handleStatusChange = (id: string, status: BikeStatus) => {
    updateMut.mutate({ id, status });
  };

  const confirmCreate = async () => {
    if (!pendingCreate) return;
    const label = `${pendingCreate.row}${pendingCreate.col}`;
    try {
      await createMut.mutateAsync({
        unitId: unit.id,
        label,
        row: pendingCreate.row,
        col: pendingCreate.col,
      });
      setPendingCreate(null);
    } catch {
      // Most likely conflict on label — bail; admin will see the error
      // surface in next iteration when we wire toasts.
      setPendingCreate(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
      if (selectedId === pendingDelete.id) setSelectedId(null);
    } catch {
      setPendingDelete(null);
    }
  };

  if (bikesQ.isLoading) {
    return <div className="text-ink-2">Carregando bikes...</div>;
  }
  if (bikesQ.isError) {
    return <div className="text-clay-d">Erro ao carregar bikes.</div>;
  }

  const totalSlots = unit.maxRows * unit.maxCols;
  const placed = bikes.length - unplaced.length;

  return (
    <>
      <LayoutControls unit={unit} />

      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-ink-2">
        <span>
          {placed}/{totalSlots} posições ocupadas
          {unplaced.length > 0 && (
            <span className="ml-2 text-clay-d">
              · {unplaced.length} sem posição
            </span>
          )}
        </span>
        {selectedId && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="rounded-full bg-cream-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-2 hover:bg-sand"
          >
            fechar detalhes
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-2.5 sm:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const isActive = filter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? 'all' : status)}
              className={`rounded-md p-4 text-left transition-colors ${
                isActive
                  ? `${meta.bg} ring-2 ring-current ${meta.color}`
                  : `${meta.bg} ${meta.color} hover:brightness-95`
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wide opacity-85">
                {meta.label}
              </div>
              <div className="display-tight mt-1.5 text-[38px] leading-none">
                {counts[status]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Arena
          unit={unit}
          cellMap={cellMap}
          filter={filter}
          selectedId={selectedId}
          onCellClick={handleCellClick}
          busy={updateMut.isPending}
        />
        <BikeDetail
          bike={selected}
          unitName={unit.name}
          disabled={updateMut.isPending}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          onDelete={() => selected && setPendingDelete(selected)}
        />
      </div>

      {unplaced.length > 0 && (
        <UnplacedTray
          bikes={unplaced}
          selectedId={selectedId}
          filter={filter}
          onClick={handleUnplacedClick}
        />
      )}

      <ConfirmModal
        open={!!pendingCreate}
        onClose={() => !createMut.isPending && setPendingCreate(null)}
        onConfirm={confirmCreate}
        title={
          pendingCreate ? (
            <>
              criar bike{' '}
              <span className="mono">
                {pendingCreate.row}
                {pendingCreate.col}
              </span>
              ?
            </>
          ) : (
            'criar bike'
          )
        }
        description={
          <>
            O label vai ser{' '}
            <b className="text-ink mono">
              {pendingCreate?.row}
              {pendingCreate?.col}
            </b>{' '}
            (auto-derivado da posição). A bike entra como{' '}
            <b className="text-ink">em linha</b>; mude pra manutenção ou fora
            depois pelo painel de detalhes.
          </>
        }
        confirmLabel="criar bike"
        cancelLabel="voltar"
        confirmTone="clay"
        loading={createMut.isPending}
      />

      <DoubleConsentModal
        open={!!pendingDelete}
        onClose={() => !deleteMut.isPending && setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={
          pendingDelete ? (
            <>
              excluir bike <span className="mono">{pendingDelete.label}</span>?
            </>
          ) : (
            'excluir bike'
          )
        }
        description={
          <>
            A bike vai sumir da arena, do mapa de reservas e da contagem de
            capacidade. Reservas <i>históricas</i> seguem resolvendo o label —
            mas a bike não pode mais ser reservada nem reposta. Pra apenas
            tirá-la temporariamente, use o status <b>fora</b>.
          </>
        }
        consentLabel="confirmo que quero excluir definitivamente — sei que essa bike sai do mapa e da capacidade da arena."
        confirmLabel="excluir bike"
        loading={deleteMut.isPending}
      />
    </>
  );
}

interface ArenaProps {
  unit: AdminUnit;
  cellMap: Map<string, AdminBike>;
  filter: BikeStatus | 'all';
  selectedId: string | null;
  onCellClick: (row: string, col: number) => void;
  busy: boolean;
}

function Arena({
  unit,
  cellMap,
  filter,
  selectedId,
  onCellClick,
  busy,
}: ArenaProps) {
  const rows = ROW_LETTERS.slice(0, unit.maxRows);
  const cols = Array.from({ length: unit.maxCols }, (_, i) => i + 1);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-sand p-5 pb-7"
      style={{
        background:
          'linear-gradient(180deg, var(--color-sea) 0%, var(--color-sea-d) 35%, var(--color-sand) 35%, var(--color-cream-2) 100%)',
      }}
    >
      <div className="display-tight text-[13px] italic tracking-wide text-cream/75">
        ↑ oceano
      </div>

      <div className="mt-7 flex flex-col gap-3.5 rounded-sm bg-white/50 p-4 backdrop-blur-[2px]">
        {rows.map((row) => (
          <div
            key={row}
            className="grid items-center gap-2"
            style={{
              gridTemplateColumns: `24px repeat(${unit.maxCols}, 1fr)`,
            }}
          >
            <div className="display-tight text-[18px] text-ink-2">{row}</div>
            {cols.map((col) => {
              const bike = cellMap.get(`${row}:${col}`);
              return (
                <Cell
                  key={`${row}:${col}`}
                  row={row}
                  col={col}
                  bike={bike}
                  filter={filter}
                  selectedId={selectedId}
                  onClick={() => onCellClick(row, col)}
                  disabled={busy}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between text-[11px] font-semibold text-ink-2">
        <span>↓ entrada · av. atlântica</span>
        <span>
          {unit.maxRows} × {unit.maxCols} = {unit.maxRows * unit.maxCols}{' '}
          posições
        </span>
      </div>
    </div>
  );
}

interface CellProps {
  row: string;
  col: number;
  bike: AdminBike | undefined;
  filter: BikeStatus | 'all';
  selectedId: string | null;
  onClick: () => void;
  disabled: boolean;
}

function Cell({ row, col, bike, filter, selectedId, onClick, disabled }: CellProps) {
  if (!bike) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="aspect-square rounded-xs border-2 border-dashed border-sand-2/60 bg-white/30 transition-colors hover:border-clay hover:bg-clay/10 disabled:cursor-not-allowed disabled:opacity-50"
        title={`criar bike ${row}${col}`}
      >
        <span className="block text-[18px] text-ink-3 opacity-50">+</span>
      </button>
    );
  }

  const meta = STATUS_META[bike.status];
  const dim = filter !== 'all' && filter !== bike.status;
  const isSelected = bike.id === selectedId;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xs transition-all ${
        dim ? 'bg-white/40 text-ink-2 opacity-40' : `${meta.bg} ${meta.color}`
      } ${
        isSelected
          ? 'ring-[2.5px] ring-ink scale-105'
          : `ring-2 ring-current/40 ${dim ? 'ring-transparent' : ''}`
      } hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50`}
      title={`${bike.label}`}
    >
      <span className="display-tight text-[13px] leading-none">
        {bike.col ?? extractNum(bike.label)}
      </span>
      <span
        className={`size-1.5 rounded-full ${dim ? 'bg-ink-2' : meta.dot}`}
      />
    </button>
  );
}

interface BikeDetailProps {
  bike: AdminBike | null;
  unitName: string;
  disabled: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: BikeStatus) => void;
  onDelete: () => void;
}

function BikeDetail({
  bike,
  unitName,
  disabled,
  onClose,
  onStatusChange,
  onDelete,
}: BikeDetailProps) {
  if (!bike) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sand-2 bg-cream-2 p-8 text-center text-ink-2">
        <div className="text-4xl opacity-40">↖</div>
        <div className="display-tight mt-3 text-[22px] leading-tight">
          selecione uma bike
        </div>
        <div className="mt-2 text-sm">
          toque em qualquer número no deque pra ver detalhes.
        </div>
      </div>
    );
  }

  const meta = STATUS_META[bike.status];

  return (
    <div className="fadein flex flex-col gap-4 rounded-lg border border-sand bg-cream p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-clay">
            {unitName} ·{' '}
            {bike.row && bike.col
              ? `${bike.row}${bike.col}`
              : 'sem posição'}
          </div>
          <div className="display-tight mono mt-1 text-[44px] leading-none">
            {bike.label}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-ink-2 hover:bg-cream-2"
        >
          <svg
            width="16"
            height="16"
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

      <span
        className={`inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-[13px] font-bold ${meta.bg} ${meta.color}`}
      >
        <span className={`size-2 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-2">
          mudar status
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {STATUS_ORDER.map((status) => {
            const m = STATUS_META[status];
            const active = bike.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(bike.id, status)}
                disabled={disabled || active}
                className={`rounded-xs px-3 py-2.5 text-left text-[13px] font-semibold transition-colors disabled:cursor-default ${
                  active
                    ? `${m.bg} ${m.color} ring-2 ring-current`
                    : 'bg-cream-2 text-ink hover:bg-sand'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-sand pt-3">
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xs px-3 py-2.5 text-[13px] font-semibold text-clay-d transition-colors hover:bg-clay-d/10"
        >
          excluir bike permanentemente
        </button>
        <div className="mt-1.5 text-[11px] leading-snug text-ink-2">
          pra apenas tirar do ar, use o status <b>fora</b> acima.
        </div>
      </div>
    </div>
  );
}

interface UnplacedTrayProps {
  bikes: AdminBike[];
  selectedId: string | null;
  filter: BikeStatus | 'all';
  onClick: (bike: AdminBike) => void;
}

function UnplacedTray({
  bikes,
  selectedId,
  filter,
  onClick,
}: UnplacedTrayProps) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-sand-2 bg-cream-2 p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-clay-d">
        sem posição na arena ({bikes.length})
      </div>
      <div className="flex flex-wrap gap-2">
        {bikes.map((b) => {
          const meta = STATUS_META[b.status];
          const dim = filter !== 'all' && filter !== b.status;
          const isSelected = b.id === selectedId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onClick(b)}
              className={`flex items-center gap-2 rounded-xs px-2.5 py-1.5 text-[13px] font-semibold transition-all ${
                dim
                  ? 'bg-white/40 text-ink-2 opacity-50'
                  : `${meta.bg} ${meta.color}`
              } ${isSelected ? 'ring-[2px] ring-ink' : ''}`}
            >
              <span className={`size-1.5 rounded-full ${meta.dot}`} />
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function extractNum(label: string): string {
  const m = /(\d+)/.exec(label);
  return m ? m[1]! : label.slice(0, 3);
}
