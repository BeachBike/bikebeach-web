import { useMemo } from 'react';
import type { FriendAttending } from '@/api/friends';
import type {
  ClassKindColorToken,
  PublicBike,
  SeatMap,
} from '@/api/public';
import { FriendBubble } from '@/components/common';
import {
  InstructorPortrait,
  toneFromColorToken,
} from '@/components/common/instructor-portrait';
import { firstName } from '@/lib/format';

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
  /// Edit-bike mode — the user is swapping the bike on an existing
  /// reservation. Allows selecting any free bike except the current one
  /// (mine = current; selecting it is a no-op, the backend rejects it).
  editMode?: boolean;
  /// G1 — friends attending this slot. The component overlays a small
  /// avatar bubble on the friend's bike cell so the user can spot a buddy
  /// at a glance.
  friendsOnSlot?: FriendAttending[];
}

/// Step 2 — bike picker.
/// Layout = adaptive grid sized by `seatMap.unit.maxRows × maxCols` with each
/// bike placed at its (row, col). The "instructor / palco" cell anchors the
/// front of the arena and is never selectable. Bikes lacking a (row, col)
/// pair fall into a tray below the grid for placement-by-admin.
export function StepBike({
  seatMap,
  bikeId,
  hoveredBikeId,
  onSelectBike,
  onHoverBike,
  usualBikeId,
  myExistingBikeId,
  editMode,
  friendsOnSlot,
}: Props) {
  // Lookup `bikeId → friend` for fast overlay rendering. Waitlisted
  // friends (no bike) are dropped because there's no cell to attach to.
  const friendByBike = useMemo(() => {
    const m = new Map<string, FriendAttending>();
    for (const f of friendsOnSlot ?? []) {
      if (f.bikeId) m.set(f.bikeId, f);
    }
    return m;
  }, [friendsOnSlot]);
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
  const profFirstName = firstName(slot.instructor.name);
  const kindColor = slot.classKind?.colorToken ?? 'SEA';

  return (
    <div className="fadeup">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        passo dois · de três
      </div>
      <h2
        className="display-tight mt-3"
        style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.92 }}
      >
        {editMode ? (
          <>
            qual bike
            <br />
            <span className="font-normal italic text-clay">você prefere?</span>
          </>
        ) : (
          <>
            onde você
            <br />
            <span className="font-normal italic text-clay">quer pedalar?</span>
          </>
        )}
      </h2>

      <p className="mt-3.5 max-w-[560px] text-sm text-ink-2">
        {editMode ? (
          <>
            sua bike atual aparece em verde. escolha outra livre — a fila A é
            mais perto do mar.
          </>
        ) : usualFree ? (
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
          seatMap={seatMap}
          profFirstName={profFirstName}
          kindColor={kindColor}
          occupiedSet={occupiedSet}
          bikeId={bikeId}
          usualBikeId={usualBikeId}
          myExistingBikeId={myExistingBikeId}
          friendByBike={friendByBike}
          onSelectBike={onSelectBike}
          onHoverBike={onHoverBike}
        />
        <BikeInfoCard
          bike={showBike}
          occupiedSet={occupiedSet}
          isSel={!!bikeId && bikeId === showBike?.id}
          isUsual={!!showBike && showBike.id === usualBikeId}
          isSuggested={!!showBike && showBike.id === suggested}
          isOccupied={!!showBike && occupiedSet.has(showBike.id)}
          isMine={!!showBike && showBike.id === myExistingBikeId}
          maxRows={seatMap.unit.maxRows}
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
  seatMap: SeatMap;
  profFirstName: string | undefined;
  kindColor: ClassKindColorToken;
  occupiedSet: Set<string>;
  bikeId: string | null;
  usualBikeId: string | null;
  myExistingBikeId: string | null;
  friendByBike: Map<string, FriendAttending>;
  onSelectBike: (bikeId: string) => void;
  onHoverBike: (bikeId: string | null) => void;
}

function Arena({
  seatMap,
  profFirstName,
  kindColor,
  occupiedSet,
  bikeId,
  usualBikeId,
  myExistingBikeId,
  friendByBike,
  onSelectBike,
  onHoverBike,
}: ArenaProps) {
  const { unit, bikes } = seatMap;
  const { maxRows, maxCols } = unit;

  // Build (row → col → bike) lookup for placed bikes. Bikes without a
  // (row, col) pair land in a tray under the arena.
  const placed = useMemo(() => {
    const m = new Map<string, Map<number, PublicBike>>();
    const orphans: PublicBike[] = [];
    for (const b of bikes) {
      if (!b.row || b.col == null) {
        orphans.push(b);
        continue;
      }
      let row = m.get(b.row);
      if (!row) {
        row = new Map();
        m.set(b.row, row);
      }
      row.set(b.col, b);
    }
    return { byRow: m, orphans };
  }, [bikes]);

  const rowLetters = useMemo(() => {
    return Array.from({ length: maxRows }, (_, i) =>
      String.fromCharCode('A'.charCodeAt(0) + i),
    );
  }, [maxRows]);

  const profBg = colorTokenToCss(kindColor);

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
        {/* Instructor cell — anchored at the front, full grid width minus
            the row-letter gutter. Always visible, never selectable. */}
        <div
          className="mb-4 flex items-center gap-2"
          aria-label="palco do instrutor"
        >
          <span className="w-6 flex-shrink-0" />
          <div
            className="flex flex-1 items-center justify-center gap-3 rounded-[12px] px-4 py-3 text-cream"
            style={{
              background: profBg,
              boxShadow: '0 10px 24px -12px rgba(28,30,38,.35)',
              cursor: 'not-allowed',
            }}
          >
            <InstructorPortrait
              photoUrl={seatMap.slot.instructor.photoUrl}
              name={seatMap.slot.instructor.name}
              tone={toneFromColorToken(kindColor)}
              size="sm"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              instrutor
            </span>
            <span
              className="display-tight"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              {profFirstName ?? 'palco'}
            </span>
            {seatMap.slot.classKind?.name && (
              <>
                <span className="opacity-50">·</span>
                <span className="text-[12px] lowercase opacity-90">
                  {seatMap.slot.classKind.name.toLowerCase()}
                </span>
              </>
            )}
          </div>
        </div>

        {rowLetters.map((letter, ri) => {
          const rowMap = placed.byRow.get(letter);
          return (
            <div
              key={letter}
              className={`flex items-center gap-2 ${ri < rowLetters.length - 1 ? 'mb-3' : ''}`}
            >
              <span
                className="display-tight w-6 flex-shrink-0 text-ink-2"
                style={{ fontSize: 18 }}
              >
                {letter}
              </span>
              <div
                className="grid flex-1 gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: maxCols }, (_, ci) => {
                  const col = ci + 1;
                  const bike = rowMap?.get(col);
                  if (!bike) {
                    return (
                      <span
                        key={`${letter}-${col}`}
                        aria-hidden
                        className="aspect-square min-h-[42px] rounded-[10px] border border-dashed"
                        style={{ borderColor: 'rgba(196,184,156,.4)' }}
                      />
                    );
                  }
                  const ocupada = occupiedSet.has(bike.id);
                  const isSel = bikeId === bike.id;
                  const isUsual = bike.id === usualBikeId && !ocupada;
                  const isMine = bike.id === myExistingBikeId;
                  const friend = friendByBike.get(bike.id) ?? null;
                  return (
                    <BikeCell
                      key={bike.id}
                      label={bike.label}
                      selected={isSel}
                      occupied={ocupada}
                      usual={isUsual}
                      mine={isMine}
                      friend={friend}
                      onSelect={() => !ocupada && onSelectBike(bike.id)}
                      onHover={(v) => onHoverBike(v ? bike.id : null)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {placed.orphans.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-sand px-3 py-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-2">
              bikes sem posição
            </div>
            <div className="flex flex-wrap gap-1.5">
              {placed.orphans.map((bike) => {
                const ocupada = occupiedSet.has(bike.id);
                const isSel = bikeId === bike.id;
                const isUsual = bike.id === usualBikeId && !ocupada;
                const isMine = bike.id === myExistingBikeId;
                const friend = friendByBike.get(bike.id) ?? null;
                return (
                  <div key={bike.id} className="w-[44px]">
                    <BikeCell
                      label={bike.label}
                      selected={isSel}
                      occupied={ocupada}
                      usual={isUsual}
                      mine={isMine}
                      friend={friend}
                      onSelect={() => !ocupada && onSelectBike(bike.id)}
                      onHover={(v) => onHoverBike(v ? bike.id : null)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
  friend,
  onSelect,
  onHover,
}: {
  label: string;
  selected: boolean;
  occupied: boolean;
  usual: boolean;
  mine: boolean;
  friend: FriendAttending | null;
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
      className="relative flex aspect-square min-h-[42px] w-full items-center justify-center rounded-[10px] text-[11px] font-bold transition-all"
      style={{
        background,
        color,
        border: `1.5px ${borderStyle} ${borderColor}`,
        cursor: occupied && !mine ? 'not-allowed' : 'pointer',
        boxShadow: shadow,
      }}
      aria-label={`Bike ${label}${occupied ? ' (ocupada)' : ''}${friend ? ` (amigo ${friend.name})` : ''}`}
    >
      {mine ? '✓' : label}
      {friend && (
        <span
          className="pointer-events-none absolute"
          style={{ top: -8, right: -8 }}
        >
          <FriendBubble
            userId={friend.userId}
            name={friend.name}
            size="sm"
            ringColor={selected ? 'var(--color-clay)' : 'var(--color-cream)'}
            title={`amigo: ${friend.name}`}
          />
        </span>
      )}
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
  occupiedSet: Set<string>;
  isSel: boolean;
  isUsual: boolean;
  isSuggested: boolean;
  isOccupied: boolean;
  isMine: boolean;
  maxRows: number;
  onSelect: () => void;
}

function BikeInfoCard({
  bike,
  isSel,
  isUsual,
  isSuggested,
  isOccupied,
  isMine,
  maxRows,
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

  const labelMatch = /^([A-Z])[-_]?(\d+)/.exec(bike.label.trim());
  const rowLetter =
    bike.row ?? labelMatch?.[1] ?? bike.label.split('-')[0] ?? '–';
  const colNumber =
    bike.col != null
      ? String(bike.col).padStart(2, '0')
      : (labelMatch?.[2] ?? bike.label);
  const rowIdx =
    rowLetter.length === 1
      ? rowLetter.charCodeAt(0) - 'A'.charCodeAt(0)
      : -1;
  const vista = vistaForRow(rowLetter, rowIdx, maxRows);

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
          bike {colNumber} · fila {rowLetter}
        </div>
        <div
          className="display-tight mono mt-1.5"
          style={{ fontSize: 60, lineHeight: 0.9 }}
        >
          {colNumber}
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
            {colNumber}
          </div>
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

function vistaForRow(letter: string, idx: number, total: number): string {
  if (idx === 0 || letter === 'A')
    return 'frente pro mar · vento na cara';
  if (idx === 1 || letter === 'B')
    return 'vista do mar · meio do som';
  if (total > 0 && idx === total - 1)
    return 'fundo · pra esconder de quem chega';
  return 'perto do palco · som inteiro';
}

function colorTokenToCss(token: ClassKindColorToken): string {
  switch (token) {
    case 'CLAY':
      return 'var(--color-clay)';
    case 'SUN':
      return 'var(--color-sun-d, #C99449)';
    case 'SEA':
      return 'var(--color-sea)';
    case 'SAND':
      return 'var(--color-sand-d, #BBA683)';
    case 'INK':
      return 'var(--color-ink)';
    case 'GREEN':
      return '#3F7A4F';
  }
}
