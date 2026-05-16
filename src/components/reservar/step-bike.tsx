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
import { useSeatMapRealtime } from '@/hooks/use-realtime';
import { formatHourMinute, intensityLabel } from '@/lib/format';

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
  /// Bike the server currently holds for this user on this slot (may
  /// differ from `bikeId` after the user backs from confirm and picks a
  /// different bike before advancing again). Excluded from the
  /// "held by other" set so it doesn't paint as someone else's reserve.
  myHeldBikeId?: string | null;
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
  myHeldBikeId,
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
  // Bikes another user is mid-booking. We DON'T treat the caller's own
  // selected bike — nor any bike the server is currently holding for the
  // caller — as "held by other" even though they're in `heldBikeIds`.
  // `bikeId` covers the normal case; `myHeldBikeId` covers the back-from-
  // confirm + pick-different-bike case where the server still holds the
  // previous bike until the user advances again.
  const heldByOtherSet = useMemo(() => {
    const s = new Set(seatMap.heldBikeIds ?? []);
    if (bikeId) s.delete(bikeId);
    if (myHeldBikeId) s.delete(myHeldBikeId);
    return s;
  }, [seatMap.heldBikeIds, bikeId, myHeldBikeId]);

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
  const kindColor = slot.classKind?.colorToken ?? 'SEA';

  // Subscribe to live seat-map updates for THIS slot. When another user
  // reserves / cancels a bike on the same slot, the backend pushes
  // `seat-map:changed` and this hook invalidates the cached seat-map
  // query so the grid repaints within a second — instead of waiting up
  // to 30s for the polling refetch.
  useSeatMapRealtime(slot.id);

  return (
    <div className="fadeup">
      <div className="text-xs font-bold uppercase tracking-widest text-clay">
        passo dois · de três
      </div>
      <h2
        className="display-tight mt-3"
        style={{ fontSize: 'clamp(28px,6vw,72px)', lineHeight: 0.92 }}
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
          kindColor={kindColor}
          occupiedSet={occupiedSet}
          heldByOtherSet={heldByOtherSet}
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
          isOccupied={
            !!showBike &&
            (occupiedSet.has(showBike.id) || heldByOtherSet.has(showBike.id))
          }
          isMine={!!showBike && showBike.id === myExistingBikeId}
          maxRows={seatMap.unit.maxRows}
          onSelect={() =>
            showBike &&
            !occupiedSet.has(showBike.id) &&
            !heldByOtherSet.has(showBike.id) &&
            onSelectBike(showBike.id)
          }
        />
      </div>
    </div>
  );
}

interface ArenaProps {
  seatMap: SeatMap;
  kindColor: ClassKindColorToken;
  occupiedSet: Set<string>;
  heldByOtherSet: Set<string>;
  bikeId: string | null;
  usualBikeId: string | null;
  myExistingBikeId: string | null;
  friendByBike: Map<string, FriendAttending>;
  onSelectBike: (bikeId: string) => void;
  onHoverBike: (bikeId: string | null) => void;
}

function Arena({
  seatMap,
  kindColor,
  occupiedSet,
  heldByOtherSet,
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

  const accent =
    kindColor === 'SUN' ? 'var(--color-clay)' : 'var(--color-sun)';
  // Keep every bike at a comfortable tap target. When the arena is wider
  // than the viewport (big maxCols on a phone) the deck scrolls sideways
  // instead of shrinking cells below ~44px — same gesture as picking a
  // cinema/plane seat on mobile.
  const deckMinWidth = maxCols * 46 + 30;

  return (
    <div>
      {/* === OCEAN + wave washing onto the sand (design prototype) === */}
      {/* Two visual zones share this container:
            • Header (top ~40%): the deep-sea horizon, painted by the
              container background — same palette as the wave so the surf
              reads as the same body of water continuing down.
            • Beach (bottom ~60%): wet sand the wave goes/comes over.
              Sand-toned (var(--color-sand)) so it sits naturally between
              the deep sea above and the dry-sand palco below. */}
      <div
        className="relative overflow-hidden rounded-t-[18px]"
        style={{
          height: 'clamp(132px,32vw,170px)',
          background:
            'linear-gradient(180deg, var(--color-sea) 0%, #1a4a4a 100%)',
        }}
      >
        {/* "oceano" wordmark — sits over the deep-sea horizon */}
        <span
          className="display-tight pointer-events-none absolute left-1/2 -translate-x-1/2 font-normal italic text-cream/85"
          style={{
            top: 'clamp(14px,4vw,22px)',
            fontSize: 'clamp(16px,3.6vw,24px)',
            letterSpacing: '0.24em',
            textShadow: '0 2px 14px rgba(0,0,0,.4)',
          }}
        >
          oceano
        </span>

        {/* Solid dry-sand base — always opaque so the deep-sea container
            bg above NEVER bleeds through the beach. Without this layer
            the `arena-wetsand` keyframe (which animates opacity 0.2→0.7
            on the original wet-sand div) would expose the blue under it
            on the low half of the cycle, turning the sand zone blue. */}
        <div
          aria-hidden
          className="absolute"
          style={{
            top: '40%',
            left: '-50%',
            width: '200%',
            height: '60%',
            borderRadius: '0 0 50% 50%',
            background: 'var(--color-sand)',
            boxShadow: '0 10px 10px 0 var(--color-sand)',
          }}
        />

        {/* Wet-sand "darkening" pulse — fades in over the dry sand when
            the wave breaks, simulating sand that just got soaked. Uses
            the original wet-sand brown so it reads as moisture against
            the lighter sand backdrop above. */}
        <div
          className="arena-anim pointer-events-none absolute"
          style={{
            top: '40%',
            left: '-50%',
            width: '200%',
            height: '60%',
            borderRadius: '0 0 50% 50%',
            background: '#c89968',
            animation: 'arena-wetsand 9s ease-in-out infinite',
            transformOrigin: '50% 0%',
          }}
        />

        {/* sea — scales up and washes onto the sand */}
        <div
          className="arena-anim absolute overflow-hidden"
          style={{
            top: '40%',
            left: '-50%',
            width: '200%',
            height: '50%',
            borderRadius: '0 0 50% 50%',
            background:
              'linear-gradient(180deg, var(--color-sea) 0%, #1a4a4a 18%, #5d9b9b 55%, #b9d4d0 82%, #e9e0c7 95%, var(--color-cream-2) 100%)',
            transformOrigin: '50% 0%',
            animation: 'arena-wave 9s ease-in-out infinite',
          }}
        >
          <div
            className="arena-anim h-full w-full"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, transparent 86%, rgba(255,255,255,.85) 95%, white 100%)',
              animation: 'arena-seafoam 9s ease-in-out infinite',
            }}
          />
          <svg
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
          >
            {Array.from({ length: 70 }).map((_, i) => {
              const s = (i * 47 + 13) % 100;
              const x = (i * 17 + s * 5) % 1200;
              const y = 70 + (s % 26);
              const r = 0.6 + (s % 8) * 0.35;
              const v = (i % 3) + 1;
              return (
                <circle
                  key={i}
                  className="arena-anim"
                  cx={x}
                  cy={y}
                  r={r}
                  fill="white"
                  style={{
                    animation: `arena-splash${v} 9s ease-in-out infinite`,
                    animationDelay: `${(s % 8) * -0.05}s`,
                    opacity: 0,
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* lingering foam left on the sand after the wave passes */}
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 right-0 w-full"
          style={{ top: '60%', height: '40%', zIndex: 2 }}
        >
          {Array.from({ length: 55 }).map((_, i) => {
            const s = (i * 53 + 7) % 100;
            const x = (i * 22 + s * 3) % 1200;
            const y = 18 + (s % 50);
            const r = 0.5 + (s % 7) * 0.3;
            const dur = [8, 9, 10, 11][i % 4];
            const delay = (((s * 13) % 100) / 100) * dur!;
            return (
              <circle
                key={i}
                className="arena-anim"
                cx={x}
                cy={y}
                r={r}
                fill="rgba(255,255,255,0.95)"
                style={{
                  animation: `arena-splash-sand ${dur}s ease-in-out infinite`,
                  animationDelay: `-${delay}s`,
                  opacity: 0,
                }}
              />
            );
          })}
        </svg>

        {/* fine spray above the crest */}
        <svg
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 right-0 w-full"
          style={{ top: '30%', height: '30%', zIndex: 3 }}
        >
          {Array.from({ length: 30 }).map((_, i) => {
            const s = (i * 67 + 11) % 100;
            const x = (i * 40 + s * 2) % 1200;
            const y = 30 + (s % 22);
            const r = 0.4 + (s % 5) * 0.25;
            const v = (i % 3) + 1;
            return (
              <circle
                key={i}
                className="arena-anim"
                cx={x}
                cy={y}
                r={r}
                fill="rgba(255,255,255,0.85)"
                style={{
                  animation: `arena-splash${v} 9s ease-in-out infinite`,
                  animationDelay: `${(s % 12) * -0.08}s`,
                  opacity: 0,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* === Arena floor: clean sand. Palco rests on it; bikes on a deck === */}
      <div
        className="relative rounded-b-[18px] px-3 pb-4 pt-5 sm:px-5"
        style={{ background: 'var(--color-cream-2)' }}
      >
        <Palco
          seatMap={seatMap}
          kindColor={kindColor}
          accent={accent}
        />

        {/* wood deck — the stripes live ONLY under the bikes */}
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
          <div
            style={{
              minWidth: deckMinWidth,
              padding: '16px 12px 12px',
              borderRadius: 14,
              background:
                'repeating-linear-gradient(135deg, #e3d4b3 0 14px, #d4c098 14px 28px)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,.4), 0 2px 0 rgba(34,28,22,.08)',
            }}
          >
            {rowLetters.map((letter, ri) => {
              const rowMap = placed.byRow.get(letter);
              return (
                <div
                  key={letter}
                  className={`flex items-center gap-2 ${ri < rowLetters.length - 1 ? 'mb-2.5' : ''}`}
                >
                  <span
                    className="display-tight w-5 flex-shrink-0 text-ink-2"
                    style={{ fontSize: 16 }}
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
                            style={{ borderColor: 'rgba(120,95,55,.28)' }}
                          />
                        );
                      }
                      const ocupada = occupiedSet.has(bike.id);
                      const heldOther = heldByOtherSet.has(bike.id);
                      const isSel = bikeId === bike.id;
                      const isUsual =
                        bike.id === usualBikeId && !ocupada && !heldOther;
                      const isMine = bike.id === myExistingBikeId;
                      const friend = friendByBike.get(bike.id) ?? null;
                      return (
                        <BikeCell
                          key={bike.id}
                          label={bike.label}
                          selected={isSel}
                          occupied={ocupada}
                          heldByOther={heldOther}
                          usual={isUsual}
                          mine={isMine}
                          friend={friend}
                          onSelect={() =>
                            !ocupada && !heldOther && onSelectBike(bike.id)
                          }
                          onHover={(v) => onHoverBike(v ? bike.id : null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {placed.orphans.length > 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-ink-2/30 px-3 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-2">
                  bikes sem posição
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {placed.orphans.map((bike) => {
                    const ocupada = occupiedSet.has(bike.id);
                    const heldOther = heldByOtherSet.has(bike.id);
                    const isSel = bikeId === bike.id;
                    const isUsual =
                      bike.id === usualBikeId && !ocupada && !heldOther;
                    const isMine = bike.id === myExistingBikeId;
                    const friend = friendByBike.get(bike.id) ?? null;
                    return (
                      <div key={bike.id} className="w-[44px]">
                        <BikeCell
                          label={bike.label}
                          selected={isSel}
                          occupied={ocupada}
                          heldByOther={heldOther}
                          usual={isUsual}
                          mine={isMine}
                          friend={friend}
                          onSelect={() =>
                            !ocupada && !heldOther && onSelectBike(bike.id)
                          }
                          onHover={(v) => onHoverBike(v ? bike.id : null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-4 text-[13px] text-ink-2">
        <Legend
          background="var(--color-cream)"
          border="var(--color-sand)"
          label="livre"
        />
        <Legend background="var(--color-clay)" label="sua escolha" />
        <Legend background="var(--color-ink-2)" label="ocupada" />
        <Legend background="#2A2A2E" label="em reserva" />
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

/// The "palco" — the instructor card that anchors the front of the arena.
/// Per the design iteration the user landed on: photo gets the emphasis
/// (large circular portrait), card tinted by the class kind's color, name
/// + a one-line "signature" (kind · pegada · duração). No fake metadata
/// (anos/aulas/apelido from the prototype don't exist in our system) and
/// no "ao vivo" flourish — this is the booking step, the class isn't live.
function Palco({
  seatMap,
  kindColor,
  accent,
}: {
  seatMap: SeatMap;
  kindColor: ClassKindColorToken;
  accent: string;
}) {
  const slot = seatMap.slot;
  const cardBg = colorTokenToCss(kindColor);
  // SUN / SAND are light fills → dark text reads better on them.
  const lightFill = kindColor === 'SUN' || kindColor === 'SAND';
  const txt = lightFill ? 'var(--color-ink)' : 'var(--color-cream)';
  const txtSub = lightFill ? 'rgba(34,28,22,.66)' : 'rgba(246,239,226,.8)';
  const kindName =
    slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  // Editorial "vibe" copy the admin writes per class kind (e.g.
  // "Despertar enérgico"). Optional — only shown when set.
  const vibe = slot.classKind?.tone?.trim() || null;
  const intens = intensityLabel(slot.classKind?.intensity);
  // 1–5 scale for the visual pegada meter; default to the middle (3)
  // when the class kind has no intensity set, mirroring intensityLabel.
  const intensValue = Math.min(
    5,
    Math.max(1, Math.round(slot.classKind?.intensity ?? 3)),
  );
  // Split full name into first + (one) surname for the prototype-style
  // "{first} {surname}" big display, with the surname rendered lighter so
  // the first name keeps emphasis. Falls back gracefully for single-word
  // names (just first, no surname span).
  const nameParts = slot.instructor.name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstLower = nameParts[0]?.toLowerCase() ?? 'palco';
  const surnameLower =
    nameParts.length > 1
      ? nameParts[nameParts.length - 1]!.toLowerCase()
      : '';

  return (
    <div className="relative mb-3">
      {/* Light beam behind the steps — sits between the card's bottom edge
          and the deck so the staging reads as "spot lights from the
          palco". Rendered first so the steps + card paint on top. */}
      <svg
        viewBox="0 0 640 36"
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: '100%',
          width: 'min(640px,95%)',
          height: 36,
          opacity: 0.55,
        }}
      >
        <defs>
          <linearGradient id="arenaBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity=".55" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="280,0 360,0 640,36 0,36" fill="url(#arenaBeam)" />
      </svg>

      <div
        className="relative flex flex-wrap items-center gap-4 overflow-hidden px-5 py-4 sm:gap-5"
        style={{
          background: cardBg,
          color: txt,
          borderRadius: '22px 22px 28px 28px',
          boxShadow: `0 16px 36px -18px ${lightFill ? 'rgba(242,166,90,.6)' : 'rgba(34,28,22,.5)'}`,
        }}
      >
        {/* Ambient accent glows — two blobs in the class-kind accent
            color, slowly breathing (palco-glow) on opposite corners with
            a phase offset so the card's color feels alive. transform-
            origin centered so the scale pulse stays anchored. */}
        <div
          aria-hidden
          className="palco-glow pointer-events-none absolute"
          style={{
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}, transparent 70%)`,
            transformOrigin: 'center',
          }}
        />
        <div
          aria-hidden
          className="palco-glow pointer-events-none absolute"
          style={{
            bottom: -70,
            left: -50,
            width: 170,
            height: 170,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}, transparent 70%)`,
            transformOrigin: 'center',
            animationDelay: '-2.5s',
          }}
        />

        <div
          className="relative shrink-0 rounded-full"
          style={{
            padding: 3,
            background: lightFill
              ? 'var(--color-ink)'
              : 'var(--color-cream)',
            boxShadow: '0 10px 28px -10px rgba(34,28,22,.4)',
          }}
        >
          <InstructorPortrait
            photoUrl={slot.instructor.photoUrl}
            name={slot.instructor.name}
            tone={toneFromColorToken(kindColor)}
            size="lg2"
          />
        </div>

        <div className="relative min-w-[140px] flex-1">
          {/* Class identity eyebrow — the canonical "{kind} com {first}"
              format users see across the app. Tracking + uppercase keep
              it small without losing legibility on mobile. */}
          <div
            className="text-[10px] font-bold uppercase tracking-[.14em] sm:text-[11px]"
            style={{ color: txtSub }}
          >
            {kindName} com {firstLower} ·{' '}
            {formatHourMinute(slot.startsAt)}
          </div>
          {/* Full instructor name — first in display weight, surname
              dimmed (prototype pattern). break-words + a flexible clamp
              let it wrap cleanly on narrow phones. */}
          <div
            className="display-tight mt-1.5 break-words leading-none"
            style={{
              fontSize: 'clamp(26px,6.5vw,42px)',
              color: txt,
            }}
          >
            {firstLower}
            {surnameLower && (
              <>
                {' '}
                <span style={{ opacity: 0.55, fontWeight: 400 }}>
                  {surnameLower}
                </span>
              </>
            )}
          </div>
          {/* Class-kind vibe — the admin's editorial one-liner. Shown on
              all viewports as flavor under the name. */}
          {vibe && (
            <div
              className="mt-1.5 text-[13px] font-medium italic"
              style={{ color: txtSub }}
            >
              {vibe}
            </div>
          )}
          {/* Mobile-only text form of pegada + duração. On desktop the
              same info is shown visually in the right module (which is
              hidden on mobile), so this avoids duplicate clutter. */}
          <div
            className="mt-1.5 text-[12px] font-medium italic sm:hidden"
            style={{ color: txtSub }}
          >
            pegada {intens} · {slot.durationMinutes} min
          </div>
        </div>

        {/* Right module (desktop only) — visual pegada meter + duração.
            Fills the empty right side of the card. Separated by a hairline
            border like the prototype's stats column. Hidden on mobile,
            where the text subtitle above carries the same info. */}
        <div
          className="relative ml-auto hidden shrink-0 items-center gap-6 border-l pl-6 sm:flex"
          style={{
            borderColor: lightFill
              ? 'rgba(34,28,22,.18)'
              : 'rgba(246,239,226,.22)',
          }}
        >
          <div className="flex flex-col gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-[.14em]"
              style={{ color: txtSub }}
            >
              pegada
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: i <= intensValue ? txt : 'transparent',
                    border: `1.5px solid ${txt}`,
                    opacity: i <= intensValue ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <span
              className="text-[12px] font-semibold italic"
              style={{ color: txt }}
            >
              {intens}
            </span>
          </div>

          <div className="flex flex-col items-start gap-1">
            <span
              className="display-tight"
              style={{ fontSize: 32, lineHeight: 1, color: txt }}
            >
              {slot.durationMinutes}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-[.14em]"
              style={{ color: txtSub }}
            >
              min
            </span>
          </div>
        </div>
      </div>

      {/* Stage "echoes" — three progressively narrower bars in the card's
          own color descending toward the deck. Reads as the palco's edge
          fading back into the floor, like duplicate cards stacking
          behind. Per the prototype's pattern. */}
      <div
        className="mx-auto"
        style={{
          width: '82%',
          height: 6,
          background: cardBg,
          opacity: 0.55,
          borderRadius: '0 0 14px 14px',
        }}
      />
      <div
        className="mx-auto"
        style={{
          width: '64%',
          height: 5,
          background: cardBg,
          opacity: 0.35,
          borderRadius: '0 0 12px 12px',
        }}
      />
      <div
        className="mx-auto"
        style={{
          width: '46%',
          height: 4,
          background: cardBg,
          opacity: 0.2,
          borderRadius: '0 0 10px 10px',
        }}
      />
    </div>
  );
}

function BikeCell({
  label,
  selected,
  occupied,
  heldByOther,
  usual,
  mine,
  friend,
  onSelect,
  onHover,
}: {
  label: string;
  selected: boolean;
  occupied: boolean;
  /// Another user is mid-booking this seat (live `BikeHold`). Renders a
  /// charcoal "em reserva" cell, not selectable. Distinct from `occupied`
  /// (a committed reservation) so the user can tell it might free up.
  heldByOther: boolean;
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
  } else if (heldByOther) {
    // Charcoal — darker/cooler than the brown ink-2 "ocupada" so the two
    // read as different states at a glance.
    background = '#2A2A2E';
    color = 'rgba(246,239,226,.65)';
    borderColor = '#2A2A2E';
  } else if (usual) {
    background = '#F8C988';
    color = 'var(--color-ink)';
    borderColor = 'var(--color-clay)';
    borderStyle = 'dashed';
  }

  const locked = (occupied && !mine) || heldByOther;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      disabled={locked}
      className="relative flex aspect-square min-h-[42px] w-full items-center justify-center rounded-[10px] text-[11px] font-bold transition-all"
      style={{
        background,
        color,
        border: `1.5px ${borderStyle} ${borderColor}`,
        cursor: locked ? 'not-allowed' : 'pointer',
        boxShadow: shadow,
      }}
      aria-label={`Bike ${label}${occupied ? ' (ocupada)' : heldByOther ? ' (em reserva)' : ''}${friend ? ` (amigo ${friend.name})` : ''}`}
    >
      {mine ? '✓' : heldByOther ? '•' : label}
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
