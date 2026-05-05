import { Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

/// Stub dashboard. Real layout (KPI cards, próxima aula countdown, plan
/// progress) lives in Phase 7c.
export function DashboardRoute() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-svh bg-cream px-8 py-12">
      <header className="mb-12 flex items-center justify-between">
        <span className="display-tight text-2xl text-clay">bikebeach</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-2">{user.email}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clear();
              navigate('/', { replace: true });
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="display text-4xl text-ink">Bem-vindo, ciclista.</h1>
        <p className="text-ink-2">
          Você está autenticado. O dashboard real (próxima aula, créditos,
          histórico) chega na próxima sprint.
        </p>
        <p className="mono text-xs uppercase tracking-widest text-ink-3">
          role: {user.role} · unitId: {user.unitId ?? '—'}
        </p>
      </section>
    </div>
  );
}
