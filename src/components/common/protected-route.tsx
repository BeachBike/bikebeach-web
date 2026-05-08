import { Navigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check (if required)
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
