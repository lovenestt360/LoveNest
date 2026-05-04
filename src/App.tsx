import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
// TooltipProvider removed to avoid duplicate React instance crash
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/app/layout/AppShell";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AuthOnlyRoute } from "@/features/auth/AuthOnlyRoute";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { PremiumGuard } from "@/features/auth/PremiumGuard";
import { AppNotifProvider } from "@/features/notifications/AppNotifContext";
import { FeatureAccessProvider } from "@/features/feature-access/FeatureAccessContext";
import { SplashGate } from "@/features/splash/SplashScreen";
import { ThemeProvider } from "@/components/theme-provider";
import { PWATutorialProvider } from "@/features/pwa/PWATutorialContext";
import { PWATutorialModal } from "@/features/pwa/PWATutorialModal";
import { PWAInstallButton } from "@/features/pwa/PWAInstallButton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Chat = lazy(() => import("./pages/Chat"));
const Mood = lazy(() => import("./pages/Mood"));
const Prayer = lazy(() => import("./pages/Prayer"));
const Plano = lazy(() => import("./pages/Plano"));
const Complaints = lazy(() => import("./pages/Complaints"));
const Memories = lazy(() => import("./pages/Memories"));
const Cycle = lazy(() => import("./pages/Cycle"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const CoupleSpace = lazy(() => import("./pages/CoupleSpace"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Fasting = lazy(() => import("./pages/Fasting"));
const Routine = lazy(() => import("./pages/Routine"));
const RoutineDay = lazy(() => import("./pages/RoutineDay"));
const RoutineManage = lazy(() => import("./pages/RoutineManage"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Challenges = lazy(() => import("./pages/Challenges"));

const TimeCapsule = lazy(() => import("./pages/TimeCapsule"));
const LoveWrapped = lazy(() => import("./pages/LoveWrapped"));
const LoveStreak = lazy(() => import("./pages/LoveStreak"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Descobrir = lazy(() => import("./pages/Descobrir"));
const Admin = lazy(() => import("./pages/Admin"));
const FeaturesControl = lazy(() => import("./pages/admin/Features"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/admin/AdminRegister"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/entrar" element={<Login />} />
    <Route path="/criar-conta" element={<Signup />} />
    <Route path="/signup" element={<Signup />} />

    {/* Auth-only routes (login required, sem pareamento obrigatório) */}
    <Route element={<AuthOnlyRoute />}>
      <Route path="/casa" element={<CoupleSpace />} />
    </Route>

    {/* Protected routes (login + pareamento) */}
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        {/* Always free routes */}
        <Route index element={<Index />} />
        <Route path="chat" element={<Chat />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="subscricao" element={<Subscription />} />
        <Route path="plano" element={<Plano />} />

        {/* Premium Routes — controlled by plan features in admin */}
        <Route element={<PremiumGuard requiredFeature="mood" />}>
          <Route path="humor" element={<Mood />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="prayer" />}>
          <Route path="oracao" element={<Prayer />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="conflicts" />}>
          <Route path="conflitos" element={<Complaints />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="memories" />}>
          <Route path="memorias" element={<Memories />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="cycle" />}>
          <Route path="ciclo" element={<Cycle />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="fasting" />}>
          <Route path="jejum" element={<Fasting />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="routine" />}>
          <Route path="rotina" element={<Navigate to="/plano?tab=rotina" replace />} />
          <Route path="rotina/dia/:date" element={<RoutineDay />} />
          <Route path="rotina/gerir" element={<RoutineManage />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="challenges" />}>
          <Route path="desafios" element={<Challenges />} />
        </Route>

        <Route element={<PremiumGuard requiredFeature="time_capsules" />}>
          <Route path="capsula" element={<TimeCapsule />} />
        </Route>
        <Route path="wrapped" element={<LoveWrapped />} />
        <Route path="lovestreak" element={<LoveStreak />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="descobrir" element={<Descobrir />} />
      </Route>
    </Route>

    {/* Admin Auth */}
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route path="/admin-setup-secret" element={<AdminRegister />} />

    {/* Protected Admin routes */}
    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/features" element={<FeaturesControl />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="lovenest-theme">
      <Toaster />
      <SonnerToaster />
      <BrowserRouter>
        <SplashGate>
          <AuthProvider>
            <FeatureAccessProvider>
              <PWATutorialProvider>
                <AppNotifProvider>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <AppRoutes />
                    </Suspense>
                  </ErrorBoundary>
                </AppNotifProvider>
                <PWAInstallButton />
                <PWATutorialModal />
              </PWATutorialProvider>
            </FeatureAccessProvider>
          </AuthProvider>
        </SplashGate>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
