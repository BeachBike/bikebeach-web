import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/// Sticky arena context for the admin dashboard.
///
/// Every arena-scoped tab (calendário, professores, bikes, visão) reads
/// `selectedArenaId` from this store. The persisted layer keeps the
/// choice across reloads + tabs so the admin doesn't have to re-pick.
///
/// `setArena(null)` is allowed and means "no arena yet" (first login,
/// before units load). The sidebar selector falls back to the first
/// active unit when this happens.
interface AdminArenaState {
  selectedArenaId: string | null;
  setArena: (id: string | null) => void;
}

export const useAdminArena = create<AdminArenaState>()(
  persist(
    (set) => ({
      selectedArenaId: null,
      setArena: (id) => set({ selectedArenaId: id }),
    }),
    {
      name: 'beachbike.admin.arena',
      partialize: (state) => ({ selectedArenaId: state.selectedArenaId }),
    },
  ),
);

/// Convenience hook — returns the currently-selected arena id, falling
/// back to the first unit in the supplied list if the persisted choice
/// is missing or no longer valid (e.g. arena was deleted). The fallback
/// is *not* persisted; the admin must explicitly pick one to make it
/// stick.
export function useResolvedArenaId(
  knownIds: string[] | undefined,
): string | undefined {
  const stored = useAdminArena((s) => s.selectedArenaId);
  if (!knownIds || knownIds.length === 0) return undefined;
  if (stored && knownIds.includes(stored)) return stored;
  return knownIds[0];
}
