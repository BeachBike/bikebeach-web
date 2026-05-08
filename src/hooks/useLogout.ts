import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';

/// Logout hook supporting three call patterns:
///   useLogout('/login') → returns ()=>void, used as onClick={handler}
///   useLogout()         → returns (path?)=>void; safe for onClick={logout}
///                         (any non-string arg falls back to default)
///   logout('/somewhere') → optional override at call time
/// The returned function accepts `unknown` so passing a React MouseEvent
/// in onClick is allowed (the event is simply ignored).
export function useLogout(defaultRedirect: string = '/') {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return (pathOrEvent?: unknown) => {
    const path =
      typeof pathOrEvent === 'string' ? pathOrEvent : defaultRedirect;
    clear();
    queryClient.clear();
    navigate(path, { replace: true });
  };
}
