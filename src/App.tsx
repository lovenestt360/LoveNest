import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
// TooltipProvider removed to avoid duplicate React instance crash
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="lovenest-theme">
      <Toaster />
      <SonnerToaster />
      <BrowserRouter>
        <SplashGate>
          <AuthProvider>
            <AppNotifProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ... routes ... */}
                </Routes>
              </Suspense>
            </AppNotifProvider>
          </AuthProvider>
        </SplashGate>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
