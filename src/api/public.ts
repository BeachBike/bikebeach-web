import { useQuery } from '@tanstack/react-query';
import { api } from './client';

/// All endpoints in this file are public (don't require auth) — they feed
/// the marketing landing page. Auth-only endpoints live elsewhere.

export interface PublicUnit {
  id: string;
  slug: string;
  name: string;
  address: string;
  description: string | null;
  /// Layout grid bounds — fileiras (A..J, 2..10) e colunas (1..12).
  maxRows: number;
  maxCols: number;
  isActive: boolean;
  /// Live count of operational bikes — drives capacity hints across the
  /// app. PIX discount + tolerância de check-in foram promovidos a
  /// constantes globais em 2026-05 (ver `web/src/lib/constants.ts`).
  lateCheckinToleranceMinutes: number;
  operationalBikeCount: number;
}

export type ClassKindColorToken =
  | 'CLAY'
  | 'SUN'
  | 'SEA'
  | 'SAND'
  | 'INK'
  | 'GREEN';

export interface PublicClassKind {
  id: string;
  slug: string;
  name: string;
  defaultDurationMinutes: number;
  intensity: number;
  tone: string | null;
  colorToken: ClassKindColorToken;
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
  /// C3 — optional time-windowed discount campaign. The 3 fields are
  /// always returned but may be `null` when no campaign is configured.
  discountPercent: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
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

export interface FeaturedInstructor {
  id: string;
  name: string;
  bio: string | null;
  primaryClassKind: {
    id: string;
    slug: string;
    name: string;
    colorToken:
      | 'CLAY'
      | 'SUN'
      | 'SEA'
      | 'SAND'
      | 'INK'
      | 'GREEN';
  } | null;
}

/// Top-N active instructors of the unit, public — feeds the home "galera
/// que conduz o pedal" section (D2 / item 2).
export function useFeaturedInstructors(
  unitId: string | undefined,
  limit = 4,
) {
  return useQuery({
    queryKey: ['featured-instructors', unitId, limit],
    enabled: !!unitId,
    queryFn: () =>
      api
        .get<FeaturedInstructor[]>(
          `/units/${unitId}/featured-instructors`,
          { params: { limit } },
        )
        .then((r) => r.data),
    staleTime: STALE_5_MIN,
  });
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

export interface PublicBike {
  id: string;
  label: string;
  row: string | null;
  col: number | null;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
}

export interface SeatMap {
  slot: PublicClassSlot;
  /// Layout bounds for the unit's arena. Used by the bike picker to render
  /// an adaptive grid instead of hardcoding 4×8.
  unit: {
    id: string;
    maxRows: number;
    maxCols: number;
  };
  bikes: PublicBike[];
  occupiedBikeIds: string[];
  freeSpots: number;
}

/// Single-call payload for the bike-picker UI: slot details + every
/// operational bike at the unit + which bike IDs are taken right now.
/// Refetched every 30s so the seat map stays warm while the user picks.
export function useSeatMap(slotId: string | undefined) {
  return useQuery({
    queryKey: ['seat-map', slotId],
    enabled: !!slotId,
    queryFn: () =>
      api
        .get<SeatMap>(`/class-slots/${slotId}/seat-map`)
        .then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/// 7-day class slot listing for the reservar flow's day picker.
export function useClassSlotsRange(
  unitId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
) {
  return useQuery({
    queryKey: ['class-slots-range', unitId, fromIso, toIso],
    enabled: !!unitId && !!fromIso && !!toIso,
    queryFn: () =>
      api
        .get<PublicClassSlot[]>('/class-slots', {
          params: { unitId, from: fromIso, to: toIso, status: 'SCHEDULED' },
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export interface PublicPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  priceCents: number;
  isActive: boolean;
  discountPercent: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PublicPlan[]>('/plans').then((r) => r.data),
    staleTime: STALE_5_MIN,
  });
}

export function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['plan', planId],
    enabled: !!planId,
    queryFn: () =>
      api.get<PublicPlan>(`/plans/${planId}`).then((r) => r.data),
    staleTime: STALE_5_MIN,
  });
}

/// PackOffer detail by id. There's no GET /pack-offers/:id; we resolve by
/// scanning every unit's public list and picking by id. v1 has a single
/// active unit so this is one extra call.
export function usePackOffer(packOfferId: string | undefined) {
  return useQuery({
    queryKey: ['pack-offer', packOfferId],
    enabled: !!packOfferId,
    queryFn: async () => {
      const units = await api
        .get<PublicUnit[]>('/units')
        .then((r) => r.data);
      for (const u of units) {
        const offers = await api
          .get<PublicPackOffer[]>('/pack-offers', { params: { unitId: u.id } })
          .then((r) => r.data);
        const found = offers.find((o) => o.id === packOfferId);
        if (found) return { offer: found, unit: u };
      }
      throw new Error('PackOffer not found');
    },
    staleTime: STALE_5_MIN,
  });
}
