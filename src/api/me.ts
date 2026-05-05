import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { PublicClassKind } from './public';
import type { FitnessLevelEnum, UserGoalEnum } from './auth';

/// Authenticated `/users/me` shape — what the backend exposes for the
/// logged-in user.
export interface Me {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  birthDate: string | null;
  goal: UserGoalEnum | null;
  fitnessLevel: FitnessLevelEnum | null;
  role: 'USER' | 'INSTRUCTOR' | 'ADMIN';
  unitId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export type CreditSource =
  | 'PURCHASE_PACK'
  | 'SUBSCRIPTION_CYCLE'
  | 'ADMIN_GRANT'
  | 'REFUND';

export interface CreditPack {
  id: string;
  source: CreditSource;
  totalCredits: number;
  remainingCredits: number;
  expiresAt: string | null;
  subscriptionId: string | null;
  paymentId: string | null;
  createdAt: string;
}

export type ReservationStatus =
  | 'ACTIVE'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_STUDIO';

export interface Reservation {
  id: string;
  classSlotId: string;
  bikeId: string;
  userId: string;
  creditPackId: string;
  promotedFromWaitlist: boolean;
  status: ReservationStatus;
  checkedInAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  classSlot: {
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
    status:
      | 'SCHEDULED'
      | 'CANCELLED_BEFORE'
      | 'CANCELLED_DURING'
      | 'COMPLETED';
  };
  bike: {
    id: string;
    label: string;
    positionX: number | null;
    positionY: number | null;
  };
}

export type PaymentMethodApi = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatusApi = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentKindApi = 'ONE_OFF_PACK' | 'SUBSCRIPTION_CYCLE';

export interface Payment {
  id: string;
  asaasChargeId: string;
  amountCents: number;
  method: PaymentMethodApi;
  status: PaymentStatusApi;
  kind: PaymentKindApi;
  paidAt: string | null;
  packCredits: number | null;
  packExpirationDays: number | null;
  subscriptionId: string | null;
  createdAt: string;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/users/me').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useMyCreditPacks() {
  return useQuery({
    queryKey: ['credit-packs', 'me'],
    queryFn: () =>
      api.get<CreditPack[]>('/credit-packs/me').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useMyReservations() {
  return useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: () =>
      api.get<Reservation[]>('/reservations/me').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['payments', 'me'],
    queryFn: () => api.get<Payment[]>('/payments/me').then((r) => r.data),
    staleTime: 60_000,
  });
}

/// Cancel a reservation. On success invalidates reservations + credit-packs
/// (refund may have created/incremented a pack).
export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) =>
      api.delete(`/reservations/${reservationId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
      qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] });
    },
  });
}
