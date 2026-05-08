import { useAuthStore } from '@/stores/auth';

/// Role-aware "abrir painel" destination. Mirrors the redirect logic in
/// `routes/auth/login.tsx`. Used by the public home so logged-in visitors
/// can jump straight to their portal instead of seeing "criar conta" CTAs.
///
/// Returns `null` when the user isn't logged in — caller should fall back
/// to the public flow (signup/login).
export function useRoleHome(): string | null {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'INSTRUCTOR') return '/professor';
  return '/dashboard';
}
