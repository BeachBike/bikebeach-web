import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

/// Singleton Socket.IO client for the bikebeach realtime channel.
///
/// **Two channels share one connection:**
/// - `seat-map:*` — public. Anyone (anon or logged in) can join a slot's
///   room and listen for `seat-map:changed`.
/// - `user:*` — authenticated. When the socket is created with a JWT in
///   the handshake auth, the server auto-joins `user:<id>`. Anonymous
///   sockets just don't receive user events.
///
/// **Resilience:** the existing TanStack Query `refetchInterval: 30_000`
/// stays as a fallback. If the socket drops (mobile network blip, server
/// restart, expired JWT), polling brings the UI back to truth. This module
/// is best-effort — never throws to callers.

let socket: Socket | null = null;
let currentToken: string | null = null;

/// Resolve the realtime server URL.
/// - Dev (`VITE_API_BASE_URL` unset → REST base is `/api`): no URL → the
///   client connects to the current page origin (`http://localhost:5173`)
///   and Vite's `/socket.io` proxy (with `ws: true`) forwards the upgrade
///   to the NestJS server on :3000.
/// - Prod (`VITE_API_BASE_URL=https://api.example.com`): strip a trailing
///   `/api` if present so we connect at the API origin root.
function resolveServerUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!raw || raw === '/api') return undefined;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return undefined;
  }
}

/// Returns the active socket, creating it on first call. Closes + recreates
/// when the access token changes (login / logout / refresh) so the `user:*`
/// channel stays consistent with the current session.
export function getSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  if (socket && currentToken === token) return socket;
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  currentToken = token;
  const url = resolveServerUrl();
  const s = url
    ? io(url, makeOpts(token))
    : io(makeOpts(token)); // same-origin
  socket = s;
  return s;
}

function makeOpts(token: string | null) {
  // `transports` must be a mutable string[] — socket.io-client's option
  // type rejects readonly tuples.
  return {
    transports: ['websocket', 'polling'],
    // Reconnect aggressively on the first few drops; back off after that.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    auth: token ? { token } : undefined,
    autoConnect: true,
  };
}

/// Tear down the connection — call from `clear()` on logout. Idempotent.
export function disconnectSocket(): void {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch {
    /* ignore */
  }
  socket = null;
  currentToken = null;
}

// Keep the socket in sync with auth state — on every token change, the
// next `getSocket()` recreates with the right auth header. We also
// proactively tear down on full logout so the user channel stops pushing
// events to a logged-out browser.
useAuthStore.subscribe((state, prev) => {
  if (prev.accessToken && !state.accessToken) {
    disconnectSocket();
  } else if (state.accessToken !== currentToken && socket) {
    // Token rotated (login / refresh). Force re-handshake.
    disconnectSocket();
  }
});
