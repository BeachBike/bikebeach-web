import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LoginRoute } from '@/routes/auth/login';
import { SignupRoute } from '@/routes/auth/signup';
import { DashboardRoute } from '@/routes/dashboard';
import { CheckoutRoute } from '@/routes/checkout';
import { LandingRoute } from '@/routes/landing';
import { PerfilRoute } from '@/routes/perfil';
import { PlanosRoute } from '@/routes/planos';
import { ReservarRoute } from '@/routes/reservar';
import { SaudeRoute } from '@/routes/saude';
import { AdminRoute } from '@/routes/admin';
import { ProfessorRoute } from '@/routes/professor';
import { ProtectedRoute } from '@/components/common/protected-route';

// Force the api client to register its interceptors at app boot.
import '@/api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/cadastro" element={<SignupRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/reservar" element={<ReservarRoute />} />
          <Route path="/saude" element={<SaudeRoute />} />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <PerfilRoute />
              </ProtectedRoute>
            }
          />
          <Route path="/checkout" element={<CheckoutRoute />} />
          <Route path="/planos" element={<ProtectedRoute><PlanosRoute /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminRoute /></ProtectedRoute>} />
          <Route path="/professor" element={<ProtectedRoute><ProfessorRoute /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
