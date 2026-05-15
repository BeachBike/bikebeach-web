import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useAuthStore } from '@/stores/auth';

export interface RosterStudent {
  reservationId: string;
  status:
    | 'ACTIVE'
    | 'CHECKED_IN'
    | 'COMPLETED'
    | 'NO_SHOW'
    | 'CANCELLED_BY_USER'
    | 'CANCELLED_BY_STUDIO';
  checkedInAt: string | null;
  promotedFromWaitlist: boolean;
  /// Free-text reason for the NO_SHOW — populated by either `selfNoShow`
  /// (user wrote a justification) or by `bulkCheckIn` (instructor-marked,
  /// uses the canonical "ausência marcada pelo professor" string).
  /// The FE uses the prefix to lock instructor-side toggles per item-8.
  cancellationReason: string | null;
  user: { id: string; name: string; email: string };
  bikeLabel: string;
  presencaCount: number;
  isFirstClass: boolean;
}

/// Constant kept in sync with `INSTRUCTOR_NO_SHOW_REASON` on the backend.
/// Used to detect "instructor-marked" NO_SHOW rows so the check-in drawer
/// can let the prof undo their own marks but not the user's self-marks.
export const INSTRUCTOR_NO_SHOW_PREFIX = 'ausência marcada pelo professor';

export function isInstructorMarkedNoShow(student: RosterStudent): boolean {
  if (student.status !== 'NO_SHOW') return false;
  return (
    student.cancellationReason
      ?.toLowerCase()
      .startsWith(INSTRUCTOR_NO_SHOW_PREFIX) ?? false
  );
}

export interface SlotRoster {
  slotId: string;
  capacity: number;
  reservedCount: number;
  waitlistCount: number;
  students: RosterStudent[];
}

export function useSlotRoster(slotId: string | undefined) {
  return useQuery({
    queryKey: ['professor', 'roster', slotId],
    enabled: !!slotId,
    queryFn: () =>
      api
        .get<SlotRoster>(`/class-slots/${slotId}/roster`)
        .then((r) => r.data),
    staleTime: 30_000,
  });
}

/// F2 — instructor manually confirms the class started. After 10min the
/// cron auto-confirms instead, so this only fires on time. On success we
/// invalidate the admin slot list (refreshes the dashboard's live card) and
/// the slot roster (some reservations may flip to CHECKED_IN later via
/// bulk-check-in).
export function useConfirmStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      api.post(`/class-slots/${slotId}/confirm-start`).then((r) => r.data),
    onSuccess: (_data, slotId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'class-slots'] });
      qc.invalidateQueries({ queryKey: ['professor', 'roster', slotId] });
    },
  });
}

/// AO VIVO live tap — flip a single reservation between presente and
/// ausente as the professor taps a bike on the live screen. Each call
/// commits immediately (no batch). Cache invalidation refreshes the
/// roster + the admin slot list so counters stay in sync.
export function useToggleCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      reservationId,
      present,
    }: {
      slotId: string;
      reservationId: string;
      present: boolean;
    }) =>
      api
        .post<{ reservationId: string; status: RosterStudent['status'] }>(
          `/class-slots/${slotId}/toggle-check-in`,
          { reservationId, present },
        )
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ['professor', 'roster', vars.slotId],
      });
      qc.invalidateQueries({ queryKey: ['admin', 'class-slots'] });
    },
  });
}

/// AO VIVO "finalizar aula" — instructor closes the class manually.
/// Backend completes the slot, converts ACTIVE → NO_SHOW and CHECKED_IN
/// → COMPLETED. No-op if the slot is already closed.
export function useFinalizeClassSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      api.post(`/class-slots/${slotId}/finalize`).then((r) => r.data),
    onSuccess: (_data, slotId) => {
      qc.invalidateQueries({ queryKey: ['professor', 'roster', slotId] });
      qc.invalidateQueries({ queryKey: ['admin', 'class-slots'] });
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      currentPassword: string;
      newPassword: string;
    }) => api.post('/auth/change-password', payload).then((r) => r.data),
    onSuccess: () => {
      // /me reflects the cleared mustChangePassword flag.
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/// Helper to detect whether the logged-in user must complete the first-login
/// password change before using anything else. Cached value comes from the
/// auth store; fresh value comes from /users/me.
export function useMustChangePassword() {
  const cached = useAuthStore((s) => s.user?.role);
  // role is in store but mustChangePassword is not — we always need to fetch
  // /me on the professor portal landing to know.
  return cached;
}
