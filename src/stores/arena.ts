import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/// Sentinel string for the "todas as arenas" mode of the global picker.
/// Stored in the same field as the actual arena id so consumers only need
/// to handle one type. The `'all'` option aggregates content across every
/// active arena; otherwise the value is a real `Unit.id`.
export const ALL_ARENAS = 'all';

export type ArenaSelection = string;

interface ArenaState {
  /// `'all'` (default) or a `Unit.id`. Persisted in localStorage so the user
  /// stays on the arena they last chose between sessions.
  selectedArenaId: ArenaSelection;
  setSelectedArena: (id: ArenaSelection) => void;
}

export const useArenaStore = create<ArenaState>()(
  persist(
    (set) => ({
      selectedArenaId: ALL_ARENAS,
      setSelectedArena: (id) => set({ selectedArenaId: id }),
    }),
    {
      name: 'bikebeach.arena',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function isAllArenas(id: ArenaSelection): boolean {
  return id === ALL_ARENAS;
}
