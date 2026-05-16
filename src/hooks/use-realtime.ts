import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/realtime';

/// Joins the slot's seat-map room and invalidates the cached `useSeatMap`
/// query whenever the backend broadcasts a `seat-map:changed` event for
/// it. Pair with the existing `useSeatMap` polling (30s) — this hook
/// turns the polling fallback into a real-time push without removing the
/// safety net.
export function useSeatMapRealtime(slotId: string | null | undefined): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!slotId) return;
    const socket = getSocket();
    const onChanged = (payload: { slotId: string }) => {
      if (payload?.slotId !== slotId) return;
      void qc.invalidateQueries({ queryKey: ['seat-map', slotId] });
    };
    socket.emit('seat-map:join', { slotId });
    socket.on('seat-map:changed', onChanged);
    // Re-join the room after a reconnect — Socket.IO does NOT preserve
    // room membership across reconnections.
    const onReconnect = () => socket.emit('seat-map:join', { slotId });
    socket.on('connect', onReconnect);

    return () => {
      socket.emit('seat-map:leave', { slotId });
      socket.off('seat-map:changed', onChanged);
      socket.off('connect', onReconnect);
    };
  }, [slotId, qc]);
}

/// Listens on the authenticated user channel. Each event invalidates the
/// queries that surface that piece of state — the UI refetches via REST,
/// so we don't need to ship the new state inside the WS payload.
///
/// Mount once at a high level of the authenticated app (e.g. the auth
/// layout / route guard). Safe to call when logged out — does nothing
/// because the gateway only opens a `user:<id>` room when a JWT is
/// present in the handshake.
export function useUserRealtime(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const onWaitlistPromoted = () => {
      void qc.invalidateQueries({ queryKey: ['my-waitlists'] });
      void qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
    };
    const onClassCancelled = () => {
      void qc.invalidateQueries({ queryKey: ['reservations', 'me'] });
      void qc.invalidateQueries({ queryKey: ['my-waitlists'] });
    };
    socket.on('waitlist:promoted', onWaitlistPromoted);
    socket.on('class:cancelled', onClassCancelled);
    socket.on('reservation:cancelled-by-studio', onClassCancelled);
    return () => {
      socket.off('waitlist:promoted', onWaitlistPromoted);
      socket.off('class:cancelled', onClassCancelled);
      socket.off('reservation:cancelled-by-studio', onClassCancelled);
    };
  }, [qc]);
}
