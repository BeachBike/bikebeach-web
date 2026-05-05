import { useQuery } from '@tanstack/react-query';
import { api } from './client';

/// All endpoints in this file are public (don't require auth) — they feed
/// the marketing landing page. Auth-only endpoints live elsewhere.

export interface PublicUnit {
  id: string;
  slug: string;
  name: string;
  address: string;
  isActive: boolean;
  lateCheckinToleranceMinutes: number;
  pixDiscountPercent: number;
  operationalBikeCount: number;
}

export interface PublicClassKind {
  id: string;
  slug: string;
  name: string;
  defaultDurationMinutes: number;
  intensity: number;
  tone: string | null;
}

export interface PublicClassSlot {
  id: string;
  unitId: string;
  instructorId: string;
  classKindId: string | null;
  classKind: PublicClassKind | null;
  instructor: { id: string; name: string };
  title: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED_BEFORE' | 'CANCELLED_DURING' | 'COMPLETED';
  reservedCount: number;
  freeSpots: number;
}

export interface PublicPackOffer {
  id: string;
  unitId: string;
  classes: number;
  priceCents: number;
  expirationDays: number;
  isActive: boolean;
  displayOrder: number;
}

const STALE_5_MIN = 5 * 60_000;

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: () => api.get<PublicUnit[]>('/units').then((r) => r.data),
    staleTime: STALE_5_MIN,
  });
}

/// Helper that picks the first active unit. v1 is single-unit so this is
/// the canonical "the unit" for the public landing.
export function useDefaultUnit() {
  const q = useUnits();
  return { ...q, unit: q.data?.[0] };
}

export function useTodayClassSlots(unitId: string | undefined, dateOffset = 0) {
  const day = new Date();
  day.setDate(day.getDate() + dateOffset);
  day.setHours(0, 0, 0, 0);
  const from = day.toISOString();
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  const to = end.toISOString();

  return useQuery({
    queryKey: ['class-slots', unitId, from, to],
    enabled: !!unitId,
    queryFn: () =>
      api
        .get<PublicClassSlot[]>('/class-slots', {
          params: { unitId, from, to, status: 'SCHEDULED' },
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function usePackOffers(unitId: string | undefined) {
  return useQuery({
    queryKey: ['pack-offers', unitId],
    enabled: !!unitId,
    queryFn: () =>
      api
        .get<PublicPackOffer[]>('/pack-offers', { params: { unitId } })
        .then((r) => r.data),
    staleTime: STALE_5_MIN,
  });
}
