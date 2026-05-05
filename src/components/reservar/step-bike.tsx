import { useMemo } from 'react';
import type { PublicBike, SeatMap } from '@/api/public';

interface Props {
  seatMap: SeatMap;
  bikeId: string | null;
  hoveredBikeId: string | null;
  onSelectBike: (bikeId: string) => void;
  onHoverBike: (bikeId: string | null) => void;
  /// User's most-frequent past bike at this unit, derived client-side.
  usualBikeId: string | null;
  /// User's existing reservation on THIS slot (highlighted but not selectable).
  myExistingBikeId: string | null;
}

/// Step 2 — bike picker.
/// Layout = design B's row-based grid (fileiras A-D × 1-N) for clarity.
/// Sidebar = design A's info card (selected bike's vista, neighbors, etc).
export function StepBike({
  seatMap,
  bikeId,
  hoveredBikeId,
  onSelectBike,
  onHoverBike,
  usualBikeId,
  myExistingBikeId,
}: Props) {
  // Group bikes by their row letter (first char of label up to "-").
  const rows = useMemo(() => groupByRow(seatMap.bikes), [seatMap.bikes]);
  const occupiedSet = useMemo(
    () => new Set(seatMap.occupiedBikeIds),
    [seatMap.occupiedBikeIds],
  );

  const showBikeId = bikeId ?? hoveredBikeId;
  const showBike =
    showBikeId == null
      ? null
      : (seatMap.bikes.find((b) => b.id === showBikeId) ?? null);

  // Suggest a free bike when the user's usual is taken — closest by index.
  const suggested = useMemo(() => {
    if (!usualBikeId) return null;
    if (!occupiedSet.has(usualBikeId)) return null;
    const sortedByLabel = [...seatMap.bikes].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    const idx = sortedByLabel.findIndex((b) => b.id === usualBikeId);
    if (idx < 0) return null;
    for (let d = 1; d < sortedByLabel.length; d++) {
      for (const dir of [-1, 1]) {
        const tent = sortedByLabel[idx + d * dir];
        if (tent && !occupiedSet.has(tent.id)) return tent.id;
      }
    }
    return null;
  }, [usualBikeId, occupiedSet, seatMap.bikes]);

  const usualBike = usualBikeId
    ? seatMap.bikes.find((b) => b.id === usualBikeId)
    : null;
  const usualFree = usualBike && !occupiedSet.has(usualBike.id);
  const suggestedBike = suggested
    ? seatMap.bikes.find((b) => b.id === suggested)
    : null;

  const slot = seatMap.slot;
  const profFirstName = slot.instructor.name.split(' ')[0]?.toLowerCase();

  return (
    <div className="fadeup">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        passo dois · de três
      </div>
      <h2
        className="display-tight mt-3"
        style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.92 }}
      >
        onde você
        <br />
        <span className="font-normal italic text-clay">quer pedalar?</span>
      </h2>

      <p className="mt-3.5 max-w-[560px] text-sm text-ink-2">
        {usualFree ? (
          <>
            Sua bike de sempre{' '}
            <b className="text-clay">{usualBike!.label}</b> tá livre. Ou tenta
            uma fileira diferente — a A é a mais perto do mar.
          </>
        ) : suggestedBike ? (
          <>
            Sua bike de sempre tá ocupada hoje.{' '}
            <b className="text-clay">{suggestedBike.label}</b> fica do lado e
            está livre.
          </>
        ) : (
          <>
            Toque numa bike livre pra ver detalhes da posição. Fila A é frente
            pro mar.
          </>
        )}
      </p>

      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Arena
          rows={rows}
          slot={slot}
          profFirstName={profFirstName}
          occupiedSet={occupiedSet}
          bikeId={bikeId}
          usualBikeId={usualBikeId}
          myExistingBikeId={myExistingBikeId}
          onSelectBike={onSelectBike}
          onHoverBike={onHoverBike}
        />
        <BikeInfoCard
          bike={showBike}
          rows={rows}
          occupiedSet={occupiedSet}
          isSel={!!bikeId && bikeId === showBike?.id}
          isUsual={!!showBike && showBike.id === usualBikeId}
          isSuggested={!!showBike && showBike.id === suggested}
          isOccupied={!!showBike && occupiedSet.has(showBike.id)}
          isMine={!!showBike && showBike.id === myExistingBikeId}
          onSelect={() =>
            showBike &&
            !occupiedSet.has(showBike.id) &&
            onSelectBike(showBike.id)
          }
        />
      </div>
    </div>
  );
}

interface ArenaProps {
  rows: ReturnType<typeof groupByRow>;
  slot: SeatMap['slot'];
  profFirstName: string | undefined;
  occupiedSet: Set<string>;
  bikeId: string | null;
  usualBikeId: string | null;
  myExistingBikeId: string | null;
  onSelectBike: (bikeId: string) => void;
  onHoverBike: (bikeId: string | null) => void;
}

function Arena({
  rows,
  profFirstName,
  occupiedSet,
  bikeId,
  usualBikeId,
  myExistingBikeId,
  onSelectBike,
  onHoverBike,
}: ArenaProps) {
  return (
    <div>
      {/* Ocean banner */}
      <div
        className="relative overflow-hidden rounded-[18px] px-5 py-5 text-center text-cream"
        style={{
          background:
            'linear-gradient(180deg, var(--color-sea) 0%, #1a4a4a 100%)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-x-0 h-px bg-cream/20"
            style={{ top: `${30 + i * 22}%` }}
          />
        ))}
        <span
          className="display-tight relative font-normal italic"
          style={{ fontSize: 24 }}
        >
          ◀ oceano ▶
        </span>
      </div>

      {/* Arena floor */}
      <div
        className="relative mt-3.5 rounded-[18px] px-5 py-5"
        style={{
          background:
            'repeating-linear-gradient(135deg, var(--color-cream-2) 0 14px, #E0D2B6 14px 28px)',
        }}
      >
        <div className="mx-auto mb-4 w-fit rounded-xl bg-ink px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-cream">
          ⌨ palco · {profFirstName ?? 'instrutor'}
        </div>

        {rows.map((row, ri) => (
          <div
            key={row.letter}
            className={`flex items-center gap-2 ${ri < rows.length - 1 ? 'mb-3' : ''}`}
          >
            <span
              className="display-tight w-6 flex-shrink-0 text-ink-2"
              style={{ fontSize: 18 }}
            >
              {row.letter}
            </span>
            <div
              className="grid flex-1 gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${row.bikes.length}, minmax(0, 1fr))`,
              }}
            >
              {row.bikes.map((bike) => {
                const ocupada = occupiedSet.has(bike.id);
                const isSel = bikeId === bike.id;
                const isUsual = bike.id === usualBikeId && !ocupada;
                const isMine = bike.id === myExistingBikeId;
                return (
                  <BikeCell
                    key={bike.id}
                    label={bike.label}
                    selected={isSel}
                    occupied={ocupada}
                    usual={isUsual}
                    mine={isMine}
                    onSelect={() => !ocupada && onSelectBike(bike.id)}
                    onHover={(v) => onHoverBike(v ? bike.id : null)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-4 text-[13px] text-ink-2">
        <Legend
          background="var(--color-cream)"
          border="var(--color-sand)"
          label="livre"
        />
        <Legend background="var(--color-clay)" label="sua escolha" />
        <Legend background="var(--color-ink-2)" label="ocupada" />
        <Legend
          background="var(--color-sun-2, #F8C988)"
          border="var(--color-clay)"
          dashed
          label="sua bike de sempre"
        />
      </div>
    </div>
  );
}

function BikeCell({
  label,
  selected,
  occupied,
  usual,
  mine,
  onSelect,
  onHover,
}: {
  label: string;
  selected: boolean;
  occupied: boolean;
  usual: boolean;
  mine: boolean;
  onSelect: () => void;
  onHover: (v: boolean) => void;
}) {
  let background = 'var(--color-cream)';
  let color = 'var(--color-ink)';
  let borderColor = 'var(--color-sand)';
  let borderStyle = 'solid';
  let shadow: string | undefined;

  if (selected) {
    background = 'var(--color-clay)';
    color = 'var(--color-cream)';
    borderColor = 'var(--color-clay-d)';
    shadow = '0 8px 24px -8px rgba(216,93,52,.6)';
  } else if (mine) {
    background = '#3F7A4F';
    color = 'var(--color-cream)';
    borderColor = '#2c5a3a';
  } else if (occupied) {
    background = 'var(--color-ink-2)';
    color = 'var(--color-cream)';
    borderColor = 'var(--color-ink-2)';
  } else if (usual) {
    background = '#F8C988';
    color = 'var(--color-ink)';
    borderColor = 'var(--color-clay)';
    borderStyle = 'dashed';
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      disabled={occupied && !mine}
      className="flex aspect-square min-h-[42px] items-center justify-center rounded-[10px] text-[11px] font-bold transition-all"
      style={{
        background,
        color,
        border: `1.5px ${borderStyle} ${borderColor}`,
        cursor: occupied && !mine ? 'not-allowed' : 'pointer',
        boxShadow: shadow,
      }}
      aria-label={`Bike ${label}${occupied ? ' (ocupada)' : ''}`}
    >
      {mine ? '✓' : label}
    </button>
  );
}

function Legend({
  background,
  border,
  dashed,
  label,
}: {
  background: string;
  border?: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-3.5 w-3.5 rounded"
        style={{
          background,
          border: border
            ? `1.5px ${dashed ? 'dashed' : 'solid'} ${border}`
            : '0',
        }}
      />
      {label}
    </span>
  );
}

interface InfoProps {
  bike: PublicBike | null;
  rows: ReturnType<typeof groupByRow>;
  occupiedSet: Set<string>;
  isSel: boolean;
  isUsual: boolean;
  isSuggested: boolean;
  isOccupied: boolean;
  isMine: boolean;
  onSelect: () => void;
}

function BikeInfoCard({
  bike,
  rows,
  occupiedSet,
  isSel,
  isUsual,
  isSuggested,
  isOccupied,
  isMine,
  onSelect,
}: InfoProps) {
  if (!bike) {
    return (
      <aside className="flex min-h-[340px] flex-col items-center justify-center rounded-[18px] bg-cream-2 p-6 text-center text-ink-2">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={0.55}
          aria-hidden
        >
          <path d="M12 22s-8-4.5-8-11a8 8 0 0 1 16 0c0 6.5-8 11-8 11z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
        <div
          className="display-tight mt-3.5 text-ink"
          style={{ fontSize: 22 }}
        >
          passe o dedo
        </div>
        <div className="mt-1.5 max-w-[220px] text-[13px]">
          toque numa bike no mapa pra ver vista, vizinhos e fileira.
        </div>
      </aside>
    );
  }

  const rowLetter = bike.label.split('-')[0]!;
  const rowIndex = rows.findIndex((r) => r.letter === rowLetter);
  const vista = vistaForRow(rowLetter, rowIndex, rows.length);
  const neighbors = bikeNeighbors(bike, rows, occupiedSet);

  const badge = isMine
    ? 'sua reserva atual'
    : isUsual
      ? 'sua bike de sempre'
      : isSuggested
        ? 'sugerida pra você'
        : null;

  return (
    <aside
      className="fadein relative flex min-h-[340px] flex-col overflow-hidden rounded-[18px] bg-ink p-6 text-cream"
      style={{ animationDuration: '.25s' }}
    >
      {badge && (
        <div
          className="absolute right-0 top-0 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: isMine ? '#3F7A4F' : 'var(--color-clay)',
            color: 'var(--color-cream)',
            borderRadius: '0 18px 0 12px',
          }}
        >
          {badge}
        </div>
      )}

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-sun">
          bike {bike.label}
        </div>
        <div
          className="display-tight mono mt-1.5"
          style={{ fontSize: 60, lineHeight: 0.9 }}
        >
          {bike.label}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-cream/85">{vista}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[10px] bg-cream/10 px-3.5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide opacity-65">
            fileira
          </div>
          <div
            className="display-tight mt-0.5"
            style={{ fontSize: 22 }}
          >
            {rowLetter}
          </div>
        </div>
        <div className="rounded-[10px] bg-cream/10 px-3.5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide opacity-65">
            posição
          </div>
          <div
            className="display-tight mt-0.5"
            style={{ fontSize: 22 }}
          >
            {bike.label.split('-')[1] ?? '–'}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-wide opacity-65">
          do lado
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {neighbors.length === 0 ? (
            <span className="text-[13px] opacity-60">ponta da fileira</span>
          ) : (
            neighbors.map((n) => (
              <span
                key={n.bike.id}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{
                  background: n.occupied
                    ? 'rgba(246,239,226,.08)'
                    : 'rgba(63,122,79,.25)',
                }}
              >
                {n.bike.label} {n.occupied ? '· ocupada' : '· livre'}
              </span>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        disabled={isOccupied && !isMine}
        className="mt-auto rounded-full px-5 py-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
        style={{
          background: isMine
            ? 'rgba(246,239,226,.15)'
            : isOccupied
              ? 'rgba(246,239,226,.15)'
              : isSel
                ? '#3F7A4F'
                : 'var(--color-clay)',
          color: 'var(--color-cream)',
          marginTop: 'auto',
        }}
      >
        {isMine
          ? 'sua reserva atual'
          : isOccupied
            ? 'ocupada'
            : isSel
              ? '✓ escolhida'
              : 'escolher essa bike'}
      </button>
    </aside>
  );
}

interface RowGroup {
  letter: string;
  bikes: PublicBike[];
}

function groupByRow(bikes: PublicBike[]): RowGroup[] {
  // Label format from the seed: "Bike 01" / "A-01" / "A1". Try to extract a
  // row letter; bikes without a row land in the "·" group (rendered last).
  const map = new Map<string, PublicBike[]>();
  for (const b of bikes) {
    const m = /^([A-Z])[-_]?\d+/.exec(b.label.trim());
    const letter = m ? m[1]! : '·';
    const arr = map.get(letter) ?? [];
    arr.push(b);
    map.set(letter, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, arr]) => ({
      letter,
      bikes: arr.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

function vistaForRow(letter: string, idx: number, total: number): string {
  if (idx === 0 || letter === 'A')
    return 'frente pro mar · vento na cara';
  if (idx === 1 || letter === 'B')
    return 'vista do mar · meio do som';
  if (idx === total - 1 || letter === 'D')
    return 'fundo · pra esconder de quem chega';
  return 'perto do palco · som inteiro';
}

function bikeNeighbors(
  bike: PublicBike,
  rows: RowGroup[],
  occupiedSet: Set<string>,
): { bike: PublicBike; occupied: boolean }[] {
  const row = rows.find((r) => r.bikes.some((b) => b.id === bike.id));
  if (!row) return [];
  const idx = row.bikes.findIndex((b) => b.id === bike.id);
  const out: { bike: PublicBike; occupied: boolean }[] = [];
  for (const offset of [-1, 1]) {
    const n = row.bikes[idx + offset];
    if (n) out.push({ bike: n, occupied: occupiedSet.has(n.id) });
  }
  return out;
}
