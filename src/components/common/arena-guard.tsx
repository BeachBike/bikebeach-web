import { useEffect } from 'react';
import { useMe } from '@/api/me';
import { useUnits } from '@/api/public';
import { ALL_ARENAS, useArenaStore } from '@/stores/arena';
import { useAuthStore } from '@/stores/auth';

/// Invisible guard mounted at the App root. Enforces the rule that an
/// INSTRUCTOR can never sit on `'all'` or on an arena outside their
/// assignment set — even when the `<ArenaPicker>` is not on the screen
/// (e.g. inside the `/professor` portal which has its own top-bar).
///
/// Snaps `useArenaStore.selectedArenaId` to the first eligible arena when
/// it drifts. No-ops for USER, ADMIN and anonymous visitors.
export function ArenaGuard() {
  const sessionUser = useAuthStore((s) => s.user);
  const isInstructor = sessionUser?.role === 'INSTRUCTOR';
  const meQ = useMe({ enabled: !!sessionUser });
  const unitsQ = useUnits();
  const selected = useArenaStore((s) => s.selectedArenaId);
  const setSelected = useArenaStore((s) => s.setSelectedArena);

  useEffect(() => {
    if (!isInstructor || !meQ.data || !unitsQ.data) return;
    const myActiveIds = new Set(
      meQ.data.arenas
        .filter((a) =>
          unitsQ.data!.some((u) => u.id === a.id && u.isActive),
        )
        .map((a) => a.id),
    );
    if (myActiveIds.size === 0) return;
    if (selected === ALL_ARENAS || !myActiveIds.has(selected)) {
      const first = meQ.data.arenas.find((a) => myActiveIds.has(a.id));
      if (first) setSelected(first.id);
    }
  }, [isInstructor, meQ.data, unitsQ.data, selected, setSelected]);

  return null;
}
