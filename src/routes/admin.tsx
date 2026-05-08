import { useState } from 'react';
import { useAdminUnits } from '@/api/admin';
import { useAuthStore } from '@/stores/auth';
import {
  AdminMobileBar,
  AdminSidebar,
  type AdminTabId,
} from '@/components/admin/sidebar';
import { AdminArenas } from '@/components/admin/tabs/arenas';
import { AdminBikes } from '@/components/admin/tabs/bikes';
import { AdminCalendar } from '@/components/admin/tabs/calendar';
import { AdminClassKinds } from '@/components/admin/tabs/class-kinds';
import { AdminInstructors } from '@/components/admin/tabs/instructors';
import { AdminPlansAndOffers } from '@/components/admin/tabs/plans-offers';
import { AdminVision } from '@/components/admin/tabs/vision';
import { useResolvedArenaId } from '@/stores/admin-arena';

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const unitsQ = useAdminUnits(true);
  const knownIds = (unitsQ.data ?? []).map((u) => u.id);
  // 2026-05 — every arena-scoped tab reads from the persisted store via
  // `useResolvedArenaId`. The fallback to first known id keeps tabs
  // alive while the persisted choice is still loading.
  const unitId = useResolvedArenaId(knownIds);
  const [activeTab, setActiveTab] = useState<AdminTabId>('vision');

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-ink-2">Acesso negado.</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[240px_1fr]">
      <AdminSidebar active={activeTab} onChange={setActiveTab} />
      <div className="overflow-hidden">
        <AdminMobileBar active={activeTab} onChange={setActiveTab} />
        <main
          className="mx-auto max-w-[1400px] px-5 py-8 pb-16 sm:px-7 lg:px-9"
          data-screen-label={`admin · ${activeTab}`}
        >
          {activeTab === 'vision' && <AdminVision unitId={unitId} />}
          {activeTab === 'calendar' && <AdminCalendar unitId={unitId} />}
          {activeTab === 'arenas' && <AdminArenas />}
          {activeTab === 'instructors' && (
            <AdminInstructors unitId={unitId} />
          )}
          {activeTab === 'class-kinds' && <AdminClassKinds />}
          {activeTab === 'plans' && <AdminPlansAndOffers unitId={unitId} />}
          {activeTab === 'bikes' && <AdminBikes unitId={unitId} />}
        </main>
      </div>
    </div>
  );
}
