import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

/// Versions are bumped here whenever the document or PAR-Q questionnaire
/// changes. A bump invalidates every existing acceptance — users have to
/// re-accept on their next reservation attempt.
export const LIABILITY_VERSION = 'v1.0';
export const PARQ_VERSION = 'v1.0';

interface GateField {
  version: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  valid: boolean;
}

export interface ParqField extends GateField {
  latestAnswers: Record<string, unknown> | null;
  /// True when the latest PAR-Q has any risk-flagged answer. Drives the
  /// "estou ciente" warning before reserving.
  flagged: boolean;
  flaggedKeys: string[];
}

export interface HealthGateStatus {
  liability: GateField;
  parq: ParqField;
  ok: boolean;
}

/// Manager (instructor of the class / admin) read-only view of a
/// participant's PAR-Q + liability. Fetched on demand when a participant is
/// selected in the roster.
export interface ParticipantHealth {
  parq: {
    version: string | null;
    acceptedAt: string | null;
    expiresAt: string | null;
    valid: boolean;
    flagged: boolean;
    flaggedKeys: string[];
    answers: Record<string, unknown> | null;
    notes: string | null;
  };
  liability: {
    version: string | null;
    acceptedAt: string | null;
    expiresAt: string | null;
    valid: boolean;
  };
}

export function useParticipantHealth(
  slotId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['participant-health', slotId, userId],
    enabled: !!slotId && !!userId,
    queryFn: () =>
      api
        .get<ParticipantHealth>(
          `/class-slots/${slotId}/participants/${userId}/health`,
        )
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useHealthGateStatus() {
  return useQuery({
    queryKey: ['health-gate', 'status'],
    queryFn: () =>
      api.get<HealthGateStatus>('/health-gate/status').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useAcceptLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post('/liability/accept', { version: LIABILITY_VERSION })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-gate', 'status'] });
    },
  });
}

export function useSubmitParq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, unknown>) =>
      api
        .post('/parq/submit', { version: PARQ_VERSION, answers })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-gate', 'status'] });
    },
  });
}
