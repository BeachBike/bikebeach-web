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
}

export interface HealthGateStatus {
  liability: GateField;
  parq: ParqField;
  ok: boolean;
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
