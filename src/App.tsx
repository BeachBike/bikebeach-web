import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ForgotPasswordRoute } from '@/routes/auth/forgot-password';
import { LoginRoute } from '@/routes/auth/login';
import { ResetPasswordRoute } from '@/routes/auth/reset-password';
import { SignupRoute } from '@/routes/auth/signup';
import { DashboardRoute } from '@/routes/dashboard';
import { CheckoutRoute } from '@/routes/checkout';
import { FaqRoute } from '@/routes/faq';
import { LandingRoute } from '@/routes/landing';
import { PerfilRoute } from '@/routes/perfil';
import { PrivacidadeRoute } from '@/routes/privacidade';
import { TermosRoute } from '@/routes/termos';
import { PlanosRoute } from '@/routes/planos';
import { ReservarRoute } from '@/routes/reservar';
import { SaudeRoute } from '@/routes/saude';
import { AdminRoute } from '@/routes/admin';
import { ProfessorRoute } from '@/routes/professor';
import { ArenaGuard } from '@/components/common/arena-guard';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ScrollToTop } from '@/components/common/scroll-to-top';

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
        <ScrollToTop />
        <ArenaGuard />
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/faq" element={<FaqRoute />} />
          <Route path="/termos" element={<TermosRoute />} />
          <Route path="/privacidade" element={<PrivacidadeRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/cadastro" element={<SignupRoute />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordRoute />} />
          <Route path="/redefinir-senha" element={<ResetPasswordRoute />} />
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
