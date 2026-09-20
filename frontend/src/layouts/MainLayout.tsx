import { Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

/** Authenticated app shell — Angular-style layout with router outlet. */
export function MainLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
