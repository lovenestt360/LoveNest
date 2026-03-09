import { Outlet } from "react-router-dom";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { Fab } from "@/app/layout/Fab";

export function AppShell() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
        <Outlet />
      </main>

      <Fab />
      <BottomTabs />
    </div>
  );
}
