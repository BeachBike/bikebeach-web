import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

/// G1 — friend graph hooks. Backend lives at `/friends` plus the
/// authenticated overlay `/class-slots/friends-attending-batch`.

export type FriendRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED';

export interface FriendCode {
  code: string; // display form `XXXX-XXXX`
}

export interface Friend {
  userId: string;
  name: string;
  hideReservationsFromFriends: boolean;
  friendsSince: string; // ISO
}

export interface FriendRequestSummary {
  id: string;
  status: FriendRequestStatus;
  createdAt: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
}

export interface PendingRequests {
  incoming: FriendRequestSummary[];
  outgoing: FriendRequestSummary[];
}

export interface SendRequestResult {
  id: string;
  status: FriendRequestStatus;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  /// True when the backend detected a reciprocal pending request and
  /// short-circuited into the friendship — the UI should celebrate
  /// instead of saying "convite enviado".
  autoAccepted: boolean;
}

export interface FriendAttending {
  userId: string;
  name: string;
  /// Null when the friend is on the waitlist (no bike picked yet).
  bikeId: string | null;
  isWaitlisted: boolean;
}

export type FriendsAttendingBySlot = Record<string, FriendAttending[]>;

const STALE_30S = 30_000;

export function useMyFriendCode() {
  return useQuery({
    queryKey: ['friends', 'my-code'],
    queryFn: () =>
      api.get<FriendCode>('/friends/my-code').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useRegenerateFriendCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<FriendCode>('/friends/regenerate-code').then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['friends', 'my-code'], data);
    },
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => api.get<Friend[]>('/friends').then((r) => r.data),
    staleTime: STALE_30S,
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () =>
      api.get<PendingRequests>('/friends/requests').then((r) => r.data),
    staleTime: STALE_30S,
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api
        .post<SendRequestResult>('/friends/requests', { code })
        .then((r) => r.data),
    onSuccess: () => {
      // The server may have created a friendship (auto-accept) OR a pending
      // request — either way, both lists need to refresh.
      qc.invalidateQueries({ queryKey: ['friends', 'list'] });
      qc.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/friends/requests/${id}/accept`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends', 'list'] });
      qc.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/friends/requests/${id}/decline`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
}

export function useCancelFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/friends/requests/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (friendUserId: string) =>
      api.delete(`/friends/${friendUserId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends', 'list'] });
    },
  });
}

export function useUpdateVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hideReservationsFromFriends: boolean) =>
      api
        .patch<{ id: string; hideReservationsFromFriends: boolean }>(
          '/friends/visibility',
          { hideReservationsFromFriends },
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/// Batched overlay for the day-picker on /reservar. Pass an array of
/// slotIds; backend returns `{ [slotId]: FriendAttending[] }` with
/// invisible-mode friends filtered out.
export function useFriendsAttendingBatch(slotIds: string[] | undefined) {
  const key = slotIds ? [...slotIds].sort().join(',') : '';
  return useQuery({
    queryKey: ['friends', 'attending', key],
    enabled: !!slotIds && slotIds.length > 0,
    queryFn: () =>
      api
        .post<FriendsAttendingBySlot>(
          '/class-slots/friends-attending-batch',
          { slotIds },
        )
        .then((r) => r.data),
    staleTime: STALE_30S,
  });
}
