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
  /// PAR-Q com algum "SIM" — sinaliza atenção de saúde. O detalhe completo
  /// vem de `useParticipantHealth` ao selecionar o aluno.
  healthFlagged: boolean;
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
/// commits immediately (no batch).
///
/// **Optimistic** by design: the roster cache is patched the moment the
/// tap fires, before the network roundtrip resolves. Two reasons:
///   1. Studio Wi-Fi can be slow; a 400 ms wait on every tap kills the
///      "rapid attendance pass" UX the live screen exists for.
///   2. If the backend ever rejects the toggle (e.g. a stale dev server
///      still running the pre-2026-05 lock), the rollback flicker makes
///      the failure visible instead of letting it look like "the tap did
///      nothing" — which is the historic reported symptom.
/// `onSettled` invalidates so the optimistic patch is reconciled with
/// whatever the server actually persisted.
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
    onMutate: async ({ slotId, reservationId, present }) => {
      const rosterKey = ['professor', 'roster', slotId];
      await qc.cancelQueries({ queryKey: rosterKey });
      const previous = qc.getQueryData<SlotRoster>(rosterKey);
      if (previous) {
        const nextStatus: RosterStudent['status'] = present
          ? 'CHECKED_IN'
          : 'NO_SHOW';
        qc.setQueryData<SlotRoster>(rosterKey, {
          ...previous,
          students: previous.students.map((s) =>
            s.reservationId === reservationId
              ? {
                  ...s,
                  status: nextStatus,
                  // Tag instructor-marked so `isInstructorMarkedNoShow`
                  // keeps the cell tappable (back-to-present) instead of
                  // locking it as if the user had self-marked.
                  cancellationReason: present
                    ? null
                    : INSTRUCTOR_NO_SHOW_PREFIX,
                  checkedInAt: present
                    ? new Date().toISOString()
                    : s.checkedInAt,
                }
              : s,
          ),
        });
      }
      return { previous, rosterKey };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback to the snapshot taken in onMutate. Any error here is
      // either a permission/state issue (e.g. user-marked NO_SHOW that
      // shouldn't have been tappable) or a stale backend — the user
      // immediately sees the cell snap back, which is the right signal.
      if (ctx?.previous) {
        qc.setQueryData(ctx.rosterKey, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      // Always reconcile with the server's truth, even after a successful
      // optimistic patch — in case the backend chose a different status
      // (e.g. ACTIVE instead of NO_SHOW on an old build) we don't want a
      // permanently wrong cache.
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
