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
  bio: string | null;
  /// G1 — global "modo invisível" toggle. When true the user is hidden
  /// from friends-attending overlays everywhere.
  hideReservationsFromFriends: boolean;
  /// 2026-05 — arenas the user (typically INSTRUCTOR) can teach at.
  /// Empty for ADMIN/USER. Drives the arena selector in the prof drawer.
  arenas: { id: string; slug: string; name: string }[];
  createdAt: string;
}

export type CreditSource =
  | 'PURCHASE_PACK'
  | 'SUBSCRIPTION_CYCLE'
  | 'ADMIN_GRANT'
  | 'REFUND'
  /// 2026-05 — credits sent from a friend's pack via the transfer flow.
  | 'TRANSFER';

export interface CreditPackCoOwner {
  user: { id: string; name: string; email: string };
}

export interface CreditPack {
  id: string;
  /// User id that owns the pack (the buyer). Co-owners live in `coOwners`.
  /// Surfaced so the FE can tell "I bought it" from "I was added as a friend".
  userId?: string;
  source: CreditSource;
  totalCredits: number;
  remainingCredits: number;
  expiresAt: string | null;
  subscriptionId: string | null;
  paymentId: string | null;
  /// 2026-05 — snapshot of the PackOffer flags. Drive the transfer/share
  /// CTAs on the user's wallet.
  isTransferable: boolean;
  maxSharedUsers: number;
  /// Friends co-owning this pack (admin-defined max via `maxSharedUsers`).
  coOwners?: CreditPackCoOwner[];
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
  cancellationReason: string | null;
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
    /// Cancellation metadata — populated when the slot was cancelled by
    /// the studio (instructor or admin). Surfaced in the user's "minhas
    /// próximas aulas" so they see the reason without digging.
    cancellationKind: 'PERSONAL' | 'STUDIO' | null;
    studioCancellationReason:
      | 'CHUVA'
      | 'VENTO'
      | 'RAIO'
      | 'TECNICO'
      | 'MAR_ALTO'
      | 'MANUTENCAO'
      | 'SEGURANCA'
      | 'BAIXA_ADESAO'
      | 'OUTRO'
      | null;
    personalCancellationReason:
      | 'SAUDE'
      | 'PESSOAL'
      | 'CLIMA'
      | 'OUTRO'
      | null;
    cancellationDescription: string | null;
    cancelledAt: string | null;
  };
  bike: {
    id: string;
    label: string;
    row: string | null;
    col: number | null;
  };
}

export type PaymentMethodApi = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatusApi =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  /// 2026-05 — the Pix QR passed its due date without payment. The
  /// checkout offers a "gerar novo QR" path instead of a generic error.
  | 'EXPIRED'
  /// 2026-05 — card charge held for Asaas risk analysis. Resolves to
  /// PAID/FAILED via webhook or the reconciliation cron.
  | 'IN_REVIEW';
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
  /// 2026-05 — card metadata snapshotted from Asaas.
  installments: number | null;
  cardBrand: string | null;
  cardLast4: string | null;
  failureReason: string | null;
  createdAt: string;
}

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/users/me').then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

/// Self-service profile update. The backend allows email / phone / cpf /
/// birthDate; name is intentionally read-only at this layer (recepção
/// flow). Empty strings on `phone` and `cpf` clear the field.
export interface UpdateMePayload {
  email?: string;
  phone?: string;
  cpf?: string;
  /// ISO date (YYYY-MM-DD) — backend accepts the same `IsDateString` shape.
  birthDate?: string;
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMePayload) =>
      api.patch<Me>('/users/me', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
}

export function useMyCreditPacks(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['credit-packs', 'me'],
    queryFn: () =>
      api.get<CreditPack[]>('/credit-packs/me').then((r) => r.data),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useMyReservations() {
  // Polled every 30s so live-state transitions (próxima → ao vivo, ao vivo
  // → finalizada via cron) reflect on the dashboard without a manual
  // refresh. The window stays small because the cards depend on
  // `nowTick` for re-evaluation; data still needs to be fresh.
  return useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: () =>
      api.get<Reservation[]>('/reservations/me').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['payments', 'me'],
    queryFn: () => api.get<Payment[]>('/payments/me').then((r) => r.data),
    staleTime: 60_000,
  });
}

export interface MySubscription {
  id: string;
  userId: string;
  planId: string;
  asaasSubscriptionId: string | null;
  status:
    | 'PENDING_PAYMENT'
    | 'ACTIVE'
    | 'PAUSED'
    | 'CANCELLED'
    | 'PAST_DUE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  plan: {
    id: string;
    name: string;
    monthlyCredits: number;
    priceCents: number;
  };
}

export function useMySubscriptions(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: () =>
      api.get<MySubscription[]>('/subscriptions/me').then((r) => r.data),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
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

export interface CreateReservationPayload {
  classSlotId: string;
  bikeId: string;
}

/// User self-marks themselves as a no-show with an explicit reason.
/// Status → NO_SHOW; credit is forfeit. Allowed only during the slot's
/// run window (between startsAt and startsAt+duration).
export function useSelfNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservationId,
      reason,
    }: {
      reservationId: string;
      reason: string;
    }) =>
      api
        .post<Reservation>(`/reservations/${reservationId}/self-no-show`, {
          reason,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
    },
  });
}

/// Swap the bike on an existing reservation. Backend gates this on the 8h
/// window — outside it returns 400. Credit isn't consumed (it's the same
/// reservation, just a different bike).
export function useChangeBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservationId,
      bikeId,
    }: {
      reservationId: string;
      bikeId: string;
    }) =>
      api
        .patch<Reservation>(`/reservations/${reservationId}/bike`, { bikeId })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
      qc.invalidateQueries({ queryKey: ['seat-map', data.classSlotId] });
    },
  });
}

/// Reserve a specific bike on a class slot. The backend enforces capacity,
/// the 8h cancel window, the health gate and credit-pack consumption inside
/// a transaction. Concurrency on `(slotId, bikeId)` returns a 409.
export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReservationPayload) =>
      api.post<Reservation>('/reservations', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
      qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] });
      qc.invalidateQueries({ queryKey: ['seat-map', data.classSlotId] });
    },
  });
}

export interface JoinWaitlistResult {
  id: string;
  classSlotId: string;
  userId: string;
  joinedAt: string;
  promotedAt: string | null;
  removedAt: string | null;
  position: number;
}

/// Join the FIFO waitlist for a full class slot. Returns the entry + the
/// user's 1-indexed position. Auto-promotion happens server-side when a
/// seat opens. **Consumes 1 credit on join** (refunded on leave / studio
/// cancel / class start without promotion).
export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      api
        .post<JoinWaitlistResult>(`/class-slots/${slotId}/waitlist`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['seat-map', data.classSlotId] });
      qc.invalidateQueries({ queryKey: ['my-waitlists'] });
      qc.invalidateQueries({ queryKey: ['credit-packs'] });
    },
  });
}

export function useLeaveWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      api.delete<void>(`/class-slots/${slotId}/waitlist`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-waitlists'] });
      qc.invalidateQueries({ queryKey: ['credit-packs'] });
    },
  });
}

export interface MyWaitlist {
  id: string;
  classSlotId: string;
  joinedAt: string;
  position: number;
  slot: {
    id: string;
    startsAt: string;
    unit: { id: string; name: string; slug: string };
    classKind: {
      id: string;
      name: string;
      colorToken: string;
    } | null;
  };
}

/// Pending waitlists the user is currently on. Drives the "você está na
/// fila" state on `/reservar` and the dashboard. Refetches every minute
/// so the position decreases as people ahead get promoted.
export function useMyWaitlists() {
  return useQuery({
    queryKey: ['my-waitlists'],
    queryFn: () => api.get<MyWaitlist[]>('/me/waitlists').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ----------------------------------------------------------------------
// 2026-05 — pack transfer + share endpoints
// ----------------------------------------------------------------------

export function useTransferPackCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packId,
      toUserId,
      count,
    }: {
      packId: string;
      toUserId: string;
      count: number;
    }) =>
      api
        .post(`/credit-packs/${packId}/transfer`, { toUserId, count })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-packs'] });
    },
  });
}

export function useAddPackCoOwners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packId,
      friendUserIds,
    }: {
      packId: string;
      friendUserIds: string[];
    }) =>
      api
        .post(`/credit-packs/${packId}/co-owners`, { friendUserIds })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-packs'] });
    },
  });
}

export function useRemovePackCoOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packId,
      coOwnerUserId,
    }: {
      packId: string;
      coOwnerUserId: string;
    }) =>
      api
        .delete(`/credit-packs/${packId}/co-owners/${coOwnerUserId}`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-packs'] });
    },
  });
}

export interface CreatePixPackResult {
  paymentId: string;
  asaasChargeId: string;
  amountCents: number;
  basePriceCents: number;
  pixDiscountPercent: number;
  pix: {
    qrCodeImage: string; // base64 PNG without the data URL prefix
    qrCodePayload: string; // copia-e-cola string
    expiresAt: string;
  };
}

/// Kick off a one-off PackOffer purchase via PIX. Returns the QR code +
/// `paymentId` to poll. The actual CreditPack is created by the Asaas
/// webhook once the user pays.
export function useCreatePixPack() {
  return useMutation({
    mutationFn: (packOfferId: string) =>
      api
        .post<CreatePixPackResult>('/payments/pix-pack', { packOfferId })
        .then((r) => r.data),
  });
}

/// Raw card payload. Lives in component state only — never written to
/// localStorage, the React Query cache, or any analytics sink. Cleared
/// after submission.
export interface CreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string; // MM
  expiryYear: string; // YYYY
  ccv: string;
}

export interface CreditCardHolderInfoInput {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
}

export interface CreateCardPackPayload {
  packOfferId: string;
  billingType?: 'CREDIT_CARD' | 'DEBIT_CARD';
  installmentCount?: number;
  creditCard: CreditCardInput;
  creditCardHolderInfo: CreditCardHolderInfoInput;
}

export interface CreateCardPackResult {
  paymentId: string;
  asaasChargeId: string;
  /// PAID = aprovado já mintou crédito; IN_REVIEW = análise antifraude.
  status: 'PAID' | 'IN_REVIEW';
  amountCents: number;
  basePriceCents: number;
  campaignDiscountCents: number;
  installments: number;
  billingType: 'CREDIT_CARD' | 'DEBIT_CARD';
  cardBrand: string | null;
  cardLast4: string | null;
}

/// One-shot card pack purchase. The Asaas charge is synchronous, so the
/// returned `status` tells us immediately whether the user was approved or
/// held for risk analysis. **`retry: false`** is non-negotiable: this POST
/// is not idempotent on the Asaas side, and a silent retry would bill
/// twice. Network errors must surface to the user instead.
export function useCreateCardPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCardPackPayload) =>
      api
        .post<CreateCardPackResult>('/payments/card-pack', payload)
        .then((r) => r.data),
    retry: false,
    onSuccess: (data) => {
      // PAID → credits already minted, refresh the wallet. IN_REVIEW won't
      // have minted anything yet but invalidating is harmless and saves us
      // forgetting later.
      if (data.status === 'PAID') {
        qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] });
      }
      qc.invalidateQueries({ queryKey: ['payments', 'me'] });
    },
  });
}

export interface SubscriptionResult {
  id: string;
  userId: string;
  planId: string;
  asaasSubscriptionId: string | null;
  status:
    | 'PENDING_PAYMENT'
    | 'ACTIVE'
    | 'PAUSED'
    | 'CANCELLED'
    | 'PAST_DUE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: {
    id: string;
    name: string;
    monthlyCredits: number;
    priceCents: number;
  };
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) =>
      api
        .post<SubscriptionResult>('/subscriptions', { planId })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
      qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] });
      qc.invalidateQueries({ queryKey: ['payments', 'me'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      api
        .delete<MySubscription>(`/subscriptions/${subscriptionId}`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
      qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] });
      qc.invalidateQueries({ queryKey: ['payments', 'me'] });
    },
  });
}

/// Poll a single payment until it leaves PENDING. Backend marks PAID once
/// the Asaas webhook fires. We intentionally use a short interval (3s) and
/// stop polling as soon as we see a terminal status.
export function usePaymentPolling(
  paymentId: string | undefined,
  options: { enabled: boolean } = { enabled: true },
) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: ['payment', paymentId],
    enabled: !!paymentId && options.enabled,
    queryFn: async () => {
      const payment = await api
        .get<Payment>(`/payments/${paymentId}`)
        .then((r) => r.data);

      if (payment.status === 'PAID') {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['credit-packs', 'me'] }),
          qc.invalidateQueries({ queryKey: ['payments', 'me'] }),
          qc.invalidateQueries({ queryKey: ['subscriptions', 'me'] }),
          qc.invalidateQueries({ queryKey: ['reservations', 'me'] }),
        ]);
      }

      return payment;
    },
    refetchInterval: (query) => {
      const data = query.state.data as Payment | undefined;
      // Keep polling while the charge is still in-flight: PENDING covers
      // PIX-waiting-payment + card-just-created; IN_REVIEW covers a card
      // held for risk analysis.
      return data?.status === 'PENDING' || data?.status === 'IN_REVIEW'
        ? 3_000
        : false;
    },
    staleTime: 0,
  });
}
