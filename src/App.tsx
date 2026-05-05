import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LoginRoute } from '@/routes/auth/login';
import { SignupRoute } from '@/routes/auth/signup';
import { DashboardRoute } from '@/routes/dashboard';
import { LandingRoute } from '@/routes/landing';

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
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
