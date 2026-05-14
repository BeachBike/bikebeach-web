import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api, apiBaseUrl } from './client';

// ============================================================================
// Types
// ============================================================================

/// C3 — optional time-windowed discount fields. All three move together.
export interface DiscountCampaignFields {
  discountPercent: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
}

export interface AdminPlan extends DiscountCampaignFields {
  id: string;
  name: string;
  monthlyCredits: number;
  priceCents: number;
  isActive: boolean;
}

export interface AdminPackOffer extends DiscountCampaignFields {
  id: string;
  classes: number;
  priceCents: number;
  expirationDays: number;
  isActive: boolean;
  displayOrder: number;
  /// 2026-05 — admin flags that gate the transfer/share UI on the user side.
  isTransferable: boolean;
  /// 0 = não compartilhável; > 0 = nº máximo de amigos co-donos do pack.
  maxSharedUsers: number;
}

export interface AdminBike {
  id: string;
  label: string;
  row: string | null;
  col: number | null;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  unitId: string;
  notes: string | null;
  /// 2026-05 — soft-delete timestamp. Lists already filter `deletedAt:null`
  /// server-side, so the FE only ever sees `null` here. Kept on the type
  /// so audit views (future) can still read it.
  deletedAt: string | null;
}

export interface AdminStats {
  todayClasses: number;
  todayReservations: number;
  todayCheckedIn: number;
  todayNoShows: number;
  totalBikes: number;
  operationalBikes: number;
  /// Weekly aggregates (Mon-Sun including today). Used by the Visão Geral
  /// tab to mirror the Claude Designer prototype.
  weeklyClasses: number;
  weeklyOccupationPercent: number;
  activeInstructors: number;
  totalInstructors: number;
  weeklyOccupation: WeeklyDayOccupation[];
  topInstructors: TopInstructor[];
}

export interface WeeklyDayOccupation {
  /// 0 = Mon, 6 = Sun.
  dayIndex: number;
  classCount: number;
  totalCapacity: number;
  reservedCount: number;
  occupationPercent: number;
}

export interface TopInstructor {
  id: string;
  name: string;
  classesThisWeek: number;
  primaryClassKindName: string | null;
}

export type StaffRole = 'INSTRUCTOR' | 'ADMIN';

export interface StaffClassKind {
  id: string;
  slug: string;
  name: string;
  tone: string | null;
  colorToken: ClassKindColor;
}

export interface StaffArenaRef {
  id: string;
  slug: string;
  name: string;
}

export interface AdminStaff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  /// Legacy single-arena pointer. For ADMIN this is the source of truth
  /// (admins are single-tenant). For INSTRUCTOR this mirrors the FIRST
  /// arena in `arenas[]` for backwards-compat; new code should read
  /// `arenas[]` instead.
  unitId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  bio: string | null;
  /// Relative URL to the instructor's portrait — produced by
  /// `@imgly/background-removal` at upload time. Null = no portrait.
  photoUrl: string | null;
  /// Carro-chefe (C1 / item 15.3). Null until admin picks one.
  primaryClassKindId: string | null;
  primaryClassKind: StaffClassKind | null;
  createdAt: string;
  /// All ClassKinds the instructor is qualified to teach.
  classKinds: StaffClassKind[];
  /// 2026-05 — every arena the INSTRUCTOR can teach at. ADMIN has []
  /// here (their tenant lives on `unitId`). For INSTRUCTOR the array is
  /// the canonical source of truth; UI should drive selectors from it.
  arenas: StaffArenaRef[];
  /// Total class slots ever instructed (driven by `_count.instructedClassSlots`).
  totalClasses: number;
  /// Slots scheduled in the current week (Mon-Sun). Server populates only on
  /// the listStaff response — `0` when create/update returns the row.
  weeklyClasses?: number;
}

export type ClassKindColor =
  | 'CLAY'
  | 'SUN'
  | 'SEA'
  | 'SAND'
  | 'INK'
  | 'GREEN';

export interface AdminClassKind {
  id: string;
  slug: string;
  name: string;
  defaultDurationMinutes: number;
  intensity: number;
  tone: string | null;
  /// Design system color picked by the admin in B2.
  colorToken: ClassKindColor;
  /// Number of upcoming SCHEDULED slots — surfaces for the cascade-delete
  /// confirmation modal.
  scheduledSlotsCount: number;
  isActive: boolean;
}

export interface AdminClassSlot {
  id: string;
  unitId: string;
  instructorId: string;
  classKindId: string | null;
  classKind: {
    id: string;
    slug: string;
    name: string;
    tone: string | null;
    colorToken: ClassKindColor;
  } | null;
  instructor: { id: string; name: string };
  title: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED_BEFORE' | 'CANCELLED_DURING' | 'COMPLETED';
  /// Active reservations (ACTIVE + CHECKED_IN).
  reservedCount: number;
  /// CHECKED_IN + COMPLETED reservations — used by the calendar to render
  /// "concluída · n presentes" on COMPLETED slots (B4 / 14.6).
  presentCount: number;
  freeSpots: number;
  /// F2 — wall-clock instant the instructor confirmed the class started.
  /// Null until either the instructor taps "confirmar início" or the cron
  /// auto-confirms (`autoStartConfirmed=true`).
  confirmedStartedAt: string | null;
  autoStartConfirmed: boolean;
}

export interface AdminUnit {
  id: string;
  slug: string;
  name: string;
  address: string;
  description: string | null;
  /// Layout grid bounds (B3) — fileiras (A..J, 2..10) e colunas (1..12).
  /// 2026-05: ranges relaxed; capacity no longer stored on the unit.
  maxRows: number;
  maxCols: number;
  isActive: boolean;
  /// Hidden from the admin form (2026-05) but still present so any
  /// per-arena tweak via direct DB write keeps applying.
  lateCheckinToleranceMinutes: number;
  /// Live count of operational, non-deleted bikes — drives class-slot
  /// capacity at create-time and the "padrão da arena" hint in the UI.
  operationalBikeCount: number;
  createdAt: string;
}

// ============================================================================
// Cache keys (centralised so invalidation stays consistent)
// ============================================================================

const KEYS = {
  plans: ['admin', 'plans'] as const,
  packOffers: (unitId?: string) => ['admin', 'pack-offers', unitId] as const,
  bikes: (unitId?: string) => ['admin', 'bikes', unitId] as const,
  stats: (unitId?: string) => ['admin', 'stats', unitId] as const,
  staff: (params: { role?: StaffRole; unitId?: string }) =>
    ['admin', 'staff', params.role ?? 'all', params.unitId ?? 'all'] as const,
  classKinds: ['admin', 'class-kinds'] as const,
  classSlots: (unitId?: string, fromIso?: string, toIso?: string) =>
    ['admin', 'class-slots', unitId, fromIso, toIso] as const,
  units: (includeInactive?: boolean) =>
    ['admin', 'units', includeInactive ?? false] as const,
};

function useInvalidate() {
  const qc = useQueryClient();
  return {
    plans: () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] }),
    packOffers: () => qc.invalidateQueries({ queryKey: ['admin', 'pack-offers'] }),
    bikes: () => qc.invalidateQueries({ queryKey: ['admin', 'bikes'] }),
    stats: () => qc.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    staff: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
    classSlots: () => qc.invalidateQueries({ queryKey: ['admin', 'class-slots'] }),
    units: () => qc.invalidateQueries({ queryKey: ['admin', 'units'] }),
    publicPlans: () => qc.invalidateQueries({ queryKey: ['plans'] }),
    publicPackOffers: () => qc.invalidateQueries({ queryKey: ['pack-offers'] }),
    publicUnits: () => qc.invalidateQueries({ queryKey: ['units'] }),
  };
}

// ============================================================================
// Plans
// ============================================================================

export function useAdminPlans() {
  return useQuery({
    queryKey: KEYS.plans,
    queryFn: () =>
      api
        .get<AdminPlan[]>('/plans', { params: { includeInactive: true } })
        .then((r) => r.data),
  });
}

export function useCreatePlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      monthlyCredits: number;
      priceCents: number;
      /// C3 — optional discount campaign. Send the 3 fields together.
      discountPercent?: number;
      discountStartsAt?: string;
      discountEndsAt?: string;
    }) => api.post<AdminPlan>('/plans', payload).then((r) => r.data),
    onSuccess: () => {
      inv.plans();
      inv.publicPlans();
    },
  });
}

export function useUpdatePlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      isActive?: boolean;
      priceCents?: number;
      name?: string;
      monthlyCredits?: number;
      /// C3 — pass `null` for any of the 3 to clear the campaign.
      discountPercent?: number | null;
      discountStartsAt?: string | null;
      discountEndsAt?: string | null;
    }) => {
      const { id, ...rest } = payload;
      return api.patch<AdminPlan>(`/plans/${id}`, rest).then((r) => r.data);
    },
    onSuccess: () => {
      inv.plans();
      inv.publicPlans();
    },
  });
}

// ============================================================================
// Pack Offers
// ============================================================================

export function useAdminPackOffers(unitId: string | undefined) {
  return useQuery({
    queryKey: KEYS.packOffers(unitId),
    enabled: !!unitId,
    queryFn: () =>
      api
        .get<AdminPackOffer[]>('/pack-offers/admin', { params: { unitId } })
        .then((r) => r.data),
  });
}

export function useCreatePackOffer() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      classes: number;
      priceCents: number;
      expirationDays: number;
      displayOrder?: number;
      isTransferable?: boolean;
      maxSharedUsers?: number;
      discountPercent?: number;
      discountStartsAt?: string;
      discountEndsAt?: string;
    }) =>
      api.post<AdminPackOffer>('/pack-offers', payload).then((r) => r.data),
    onSuccess: () => {
      inv.packOffers();
      inv.publicPackOffers();
    },
  });
}

export function useUpdatePackOffer() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      isActive?: boolean;
      priceCents?: number;
      expirationDays?: number;
      displayOrder?: number;
      isTransferable?: boolean;
      maxSharedUsers?: number;
      discountPercent?: number | null;
      discountStartsAt?: string | null;
      discountEndsAt?: string | null;
    }) => {
      const { id, ...rest } = payload;
      return api
        .patch<AdminPackOffer>(`/pack-offers/${id}`, rest)
        .then((r) => r.data);
    },
    onSuccess: () => {
      inv.packOffers();
      inv.publicPackOffers();
    },
  });
}

// ============================================================================
// Bikes
// ============================================================================

export function useAdminBikes(unitId: string | undefined) {
  return useQuery({
    queryKey: KEYS.bikes(unitId),
    enabled: !!unitId,
    queryFn: () =>
      api
        .get<AdminBike[]>('/bikes', {
          params: { unitId, includeAll: true },
        })
        .then((r) => r.data),
  });
}

export function useCreateBike() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      unitId: string;
      label: string;
      row?: string;
      col?: number;
      notes?: string;
    }) => api.post<AdminBike>('/bikes', payload).then((r) => r.data),
    onSuccess: () => {
      inv.bikes();
      inv.stats();
    },
  });
}

export function useUpdateBike() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      status?: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
      label?: string;
      row?: string;
      col?: number;
      notes?: string;
    }) => {
      const { id, ...rest } = payload;
      return api.patch<AdminBike>(`/bikes/${id}`, rest).then((r) => r.data);
    },
    onSuccess: () => {
      inv.bikes();
      inv.stats();
    },
  });
}

// 2026-05 — `useSwapBikes` was removed alongside the `swap-with`
// endpoint. Admin now moves a bike with a regular PATCH and the layout
// editor only allows dropping into empty cells.

/// 2026-05 — soft-delete via `DELETE /bikes/:id`. Backend flips
/// `deletedAt`, frees the (row, col), forces status=OUT_OF_SERVICE.
/// Historical reservations still resolve `bike.label` because the row
/// stays in the DB.
export function useDeleteBike() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bikes/${id}`),
    onSuccess: () => {
      inv.bikes();
      inv.units();
      inv.stats();
    },
  });
}

// ============================================================================
// Live class (sidebar AO VIVO widget — item 20)
// ============================================================================

export interface AdminLiveSlot {
  slotId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  reservedCount: number;
  capacity: number;
  presentCount: number;
  title: string | null;
  kind: {
    id: string;
    slug: string;
    name: string;
    colorToken: ClassKindColor;
  } | null;
  instructor: { id: string; name: string };
  unit: { id: string; slug: string; name: string };
}

/// Polls every 30s — cheap query, surfaces the live-class widget in the
/// admin sidebar. Returns `null` when nothing is rolling.
export function useAdminLiveClass() {
  return useQuery({
    queryKey: ['admin', 'live-class'],
    queryFn: () =>
      api.get<AdminLiveSlot | null>('/admin/live-class').then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ============================================================================
// Stats
// ============================================================================

export function useAdminStats(unitId: string | undefined) {
  return useQuery({
    queryKey: KEYS.stats(unitId),
    enabled: !!unitId,
    queryFn: async () => {
      try {
        return await api
          .get<AdminStats>('/admin/stats', { params: { unitId } })
          .then((r) => r.data);
      } catch (error) {
        console.warn('Failed to fetch admin stats:', error);
        const fallback: AdminStats = {
          todayClasses: 0,
          todayReservations: 0,
          todayCheckedIn: 0,
          todayNoShows: 0,
          totalBikes: 0,
          operationalBikes: 0,
          weeklyClasses: 0,
          weeklyOccupationPercent: 0,
          activeInstructors: 0,
          totalInstructors: 0,
          weeklyOccupation: Array.from({ length: 7 }, (_, i) => ({
            dayIndex: i,
            classCount: 0,
            totalCapacity: 0,
            reservedCount: 0,
            occupationPercent: 0,
          })),
          topInstructors: [],
        };
        return fallback;
      }
    },
  });
}

// ============================================================================
// Staff (instructors / admins)
// ============================================================================

export function useAdminStaff(filter: { role?: StaffRole; unitId?: string }) {
  return useQuery({
    queryKey: KEYS.staff(filter),
    queryFn: () =>
      api
        .get<AdminStaff[]>('/users/staff', {
          params: {
            ...(filter.role && { role: filter.role }),
            ...(filter.unitId && { unitId: filter.unitId }),
          },
        })
        .then((r) => r.data),
  });
}

export function useCreateStaff() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      name: string;
      role: StaffRole;
      /// ADMIN: single arena (or omit for global). INSTRUCTOR: legacy
      /// single-arena pointer; prefer `unitIds` instead.
      unitId?: string;
      /// 2026-05 — INSTRUCTOR multi-arena. 1+ required when role=INSTRUCTOR.
      unitIds?: string[];
      bio?: string;
      classKindIds?: string[];
      /// Carro-chefe — required for INSTRUCTOR (server enforces).
      primaryClassKindId?: string;
    }) =>
      api.post<AdminStaff>('/users/staff', payload).then((r) => r.data),
    onSuccess: () => {
      inv.staff();
    },
  });
}

export function useUpdateStaff() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      password?: string;
      unitId?: string;
      /// 2026-05 — replaces the entire arena set when supplied (INSTRUCTOR
      /// only). Empty array is rejected — instructor must keep ≥1 arena.
      unitIds?: string[];
      isActive?: boolean;
      bio?: string;
      classKindIds?: string[];
      primaryClassKindId?: string;
    }) => {
      const { id, ...rest } = payload;
      return api
        .patch<AdminStaff>(`/users/staff/${id}`, rest)
        .then((r) => r.data);
    },
    onSuccess: () => {
      inv.staff();
    },
  });
}

/// Upload (or replace) the staff member's portrait. The frontend strips the
/// background to a transparent PNG via `@imgly/background-removal` before
/// calling this — backend rejects non-PNG payloads.
///
/// Uses native `fetch` instead of the axios instance because the instance
/// defaults `Content-Type: application/json` which fights with the multipart
/// boundary the browser needs to set. With raw fetch the browser sees a
/// FormData body and correctly emits `multipart/form-data; boundary=…`.
export function useUploadStaffPhoto() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      blob,
      mimeType,
    }: {
      id: string;
      blob: Blob;
      /// Either `'image/png'` (background-removed via @imgly) or
      /// `'image/jpeg'` (raw photo, "subir como está" path).
      mimeType: 'image/png' | 'image/jpeg';
    }) => {
      const form = new FormData();
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const file = new File([blob], `${id}.${ext}`, { type: mimeType });
      form.append('photo', file);
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${apiBaseUrl()}/users/staff/${id}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Upload falhou (${res.status}): ${text || res.statusText}`);
      }
      return (await res.json()) as AdminStaff;
    },
    onSuccess: () => {
      inv.staff();
    },
  });
}

export function useDeleteStaffPhoto() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<AdminStaff>(`/users/staff/${id}/photo`).then((r) => r.data),
    onSuccess: () => {
      inv.staff();
    },
  });
}

// ============================================================================
// Class Kinds (for instructor specialty selector + slot creation)
// ============================================================================

export function useAdminClassKinds() {
  return useQuery({
    queryKey: KEYS.classKinds,
    queryFn: () =>
      api.get<AdminClassKind[]>('/class-kinds').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useCreateClassKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      defaultDurationMinutes: number;
      intensity?: number;
      tone?: string;
      colorToken?: ClassKindColor;
    }) =>
      api.post<AdminClassKind>('/class-kinds', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.classKinds });
    },
  });
}

export function useUpdateClassKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      defaultDurationMinutes?: number;
      intensity?: number;
      tone?: string;
      colorToken?: ClassKindColor;
      isActive?: boolean;
    }) => {
      const { id, ...rest } = data;
      return api
        .patch<AdminClassKind>(`/class-kinds/${id}`, rest)
        .then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.classKinds });
    },
  });
}

/// Soft delete — flips `isActive=false` server-side. Existing aulas seguem
/// rolando; só não dá pra criar nova com esse kind. Cosmetic alias for
/// `useUpdateClassKind({ isActive: false })`.
export function useDeleteClassKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/class-kinds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.classKinds });
    },
  });
}

/// Hard delete with cascade — `POST /class-kinds/:id/cascade-delete`. Cancela
/// todas as aulas SCHEDULED desse tipo e dropa a row. Devolve a contagem
/// para a UI surfaceer no toast (item 16.2).
export function useCascadeDeleteClassKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api
        .post<{ classSlotsCancelled: number }>(
          `/class-kinds/${id}/cascade-delete`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.classKinds });
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-slots'] });
    },
  });
}

// ============================================================================
// Class Slots (calendar)
// ============================================================================

export function useAdminClassSlots(
  unitId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
) {
  // Polled every 30s so the professor / admin dashboards pick up live-state
  // transitions (próxima → ao vivo via time, ACTIVE → CHECKED_IN via the
  // auto-confirm cron, SCHEDULED → COMPLETED via markCompleted) without a
  // manual refresh. Mirrors `useMyReservations` on the user side.
  return useQuery({
    queryKey: KEYS.classSlots(unitId, fromIso, toIso),
    enabled: !!unitId && !!fromIso && !!toIso,
    queryFn: () =>
      api
        .get<AdminClassSlot[]>('/class-slots', {
          params: { unitId, from: fromIso, to: toIso },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateClassSlot() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      unitId: string;
      instructorId: string;
      classKindId?: string;
      title?: string;
      startsAt: string;
      /// 2026-05 — backend now derives `durationMinutes` from the class
      /// kind. Sending it is ignored when classKindId is set.
      durationMinutes?: number;
    }) =>
      api.post<AdminClassSlot>('/class-slots', payload).then((r) => r.data),
    onSuccess: () => {
      inv.classSlots();
      inv.stats();
    },
  });
}

export function useUpdateClassSlot() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      classKindId?: string;
      title?: string;
      startsAt?: string;
      durationMinutes?: number;
      capacity?: number;
    }) => {
      const { id, ...rest } = payload;
      return api
        .patch<AdminClassSlot>(`/class-slots/${id}`, rest)
        .then((r) => r.data);
    },
    onSuccess: () => {
      inv.classSlots();
    },
  });
}

export type StudioCancelReason =
  | 'CHUVA'
  | 'VENTO'
  | 'RAIO'
  | 'TECNICO'
  | 'MAR_ALTO'
  | 'MANUTENCAO'
  | 'SEGURANCA'
  | 'BAIXA_ADESAO'
  | 'OUTRO';
export type PersonalCancelReason = 'SAUDE' | 'PESSOAL' | 'CLIMA' | 'OUTRO';

export function useCancelClassSlot() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (
      payload:
        | {
            id: string;
            kind: 'PERSONAL';
            personalReason: PersonalCancelReason;
            description?: string;
          }
        | {
            id: string;
            kind: 'STUDIO';
            studioReason: StudioCancelReason;
            description?: string;
          },
    ) => {
      const { id, ...body } = payload;
      return api
        .post<AdminClassSlot>(`/class-slots/${id}/cancel`, body)
        .then((r) => r.data);
    },
    onSuccess: () => {
      inv.classSlots();
      inv.stats();
    },
  });
}

// ============================================================================
// Units (arenas)
// ============================================================================

export function useAdminUnits(includeInactive = true) {
  return useQuery({
    queryKey: KEYS.units(includeInactive),
    queryFn: () =>
      api
        .get<AdminUnit[]>('/units', {
          params: includeInactive ? { includeInactive: 'true' } : {},
        })
        .then((r) => r.data),
  });
}

export function useCreateUnit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      slug: string;
      address: string;
      description?: string;
      maxRows?: number;
      maxCols?: number;
    }) => api.post<AdminUnit>('/units', payload).then((r) => r.data),
    onSuccess: () => {
      inv.units();
      inv.publicUnits();
    },
  });
}

export function useUpdateUnit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      address?: string;
      description?: string | null;
      maxRows?: number;
      maxCols?: number;
      isActive?: boolean;
    }) => {
      const { id, ...rest } = payload;
      return api.patch<AdminUnit>(`/units/${id}`, rest).then((r) => r.data);
    },
    onSuccess: () => {
      inv.units();
      inv.publicUnits();
    },
  });
}

export function useDeactivateUnit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/units/${id}`).then((r) => r.data),
    onSuccess: () => {
      inv.units();
      inv.publicUnits();
    },
  });
}
