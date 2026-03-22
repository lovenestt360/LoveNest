import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
// TooltipProvider removed to avoid duplicate React instance crash
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/app/layout/AppShell";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AuthOnlyRoute } from "@/features/auth/AuthOnlyRoute";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { PremiumGuard } from "@/features/auth/PremiumGuard";
import { AppNotifProvider } from "@/features/notifications/AppNotifContext";
import { SplashGate } from "@/features/splash/SplashScreen";
import { ThemeProvider } from "@/components/theme-provider";
import { PWATutorialProvider } from "@/features/pwa/PWATutorialContext";
import { PWATutorialModal } from "@/features/pwa/PWATutorialModal";
import { PWAInstallButton } from "@/features/pwa/PWAInstallButton";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Chat = lazy(() => import("./pages/Chat"));
const Mood = lazy(() => import("./pages/Mood"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Prayer = lazy(() => import("./pages/Prayer"));
const Schedule = lazy(() => import("./pages/Schedule"));
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
const Ranking = lazy(() => import("./pages/Ranking"));
const TimeCapsule = lazy(() => import("./pages/TimeCapsule"));
const LoveWrapped = lazy(() => import("./pages/LoveWrapped"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/admin/AdminRegister"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-slide-up w-full min-h-screen">
      {children}
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
        <Route index element={<Index />} />
        <Route path="chat" element={<Chat />} />
        <Route path="humor" element={<Mood />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="subscricao" element={<Subscription />} />

        {/* Paywalled Premium Routes */}
        <Route element={<PremiumGuard requiredFeature="tasks" />}>
          <Route path="tarefas" element={<Tasks />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="prayer" />}>
          <Route path="oracao" element={<Prayer />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="agenda" />}>
          <Route path="agenda" element={<Schedule />} />
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
          <Route path="rotina" element={<Routine />} />
          <Route path="rotina/dia/:date" element={<RoutineDay />} />
          <Route path="rotina/gerir" element={<RoutineManage />} />
        </Route>
        <Route element={<PremiumGuard requiredFeature="challenges" />}>
          <Route path="desafios" element={<Challenges />} />
        </Route>
        <Route path="ranking" element={<Ranking />} />
        <Route element={<PremiumGuard requiredFeature="time_capsules" />}>
          <Route path="capsula" element={<TimeCapsule />} />
        </Route>
        <Route path="wrapped" element={<LoveWrapped />} />
      </Route>
    </Route>

    {/* Admin Auth */}
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route path="/admin-setup-secret" element={<AdminRegister />} />

    {/* Protected Admin routes */}
    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<Admin />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="lovenest-theme">
      <Toaster />
      <SonnerToaster />
      <BrowserRouter>
        <SplashGate>
          <AuthProvider>
            <PWATutorialProvider>
              <AppNotifProvider>
                <Suspense fallback={<PageLoader />}>
                  <PageTransition>
                    <AppRoutes />
                  </PageTransition>
                </Suspense>
              </AppNotifProvider>
              <PWAInstallButton />
              <PWATutorialModal />
            </PWATutorialProvider>
          </AuthProvider>
        </SplashGate>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
