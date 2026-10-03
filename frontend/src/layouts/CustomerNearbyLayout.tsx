import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, LogOut, MapPin, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerSession } from "@/pages/Login/customer-session";
import { cn } from "@/utils/utils";

const NAV = [
  { to: "/nearby", label: "Nearby", icon: MapPin, exact: true },
  { to: "/nearby/booking", label: "Booking", icon: CalendarCheck, exact: false },
  { to: "/nearby/my-bookings", label: "My bookings", icon: ClipboardList, exact: false },
] as const;

function pageTitle(pathname: string) {
  if (pathname.startsWith("/nearby/booking")) return "Booking";
  if (pathname.startsWith("/nearby/my-bookings")) return "My bookings";
  if (pathname.startsWith("/nearby/my-shops")) return "My shops & rewards";
  return "Nearby";
}

export function CustomerNearbyLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { customer, ready, signOut } = useCustomerSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => pageTitle(pathname), [pathname]);

  useEffect(() => {
    if (ready && !customer) void navigate({ to: "/login" });
  }, [ready, customer, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready || !customer) return null;

  function isActive(to: string, exact: boolean) {
    if (exact) return pathname === to || pathname === `${to}/`;
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-[15px] font-semibold leading-tight">Luxe Salon</p>
            <p className="truncate text-[11px] text-muted-foreground">Customer app</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="truncate text-xs font-medium text-foreground">{customer.name}</p>
          <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-xl"
            onClick={() => {
              signOut();
              void navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop / tablet sidebar — always visible */}
      <aside className="hidden w-[16rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[16rem] flex-col border-r border-sidebar-border bg-sidebar shadow-xl md:hidden">
            <div className="flex justify-end px-3 pt-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </Button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      ) : null}

      {/* Right content panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">Hi {customer.name.split(" ")[0]} · {customer.phone}</p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-muted/15">
          <div className="w-full px-3 py-4 sm:px-4 sm:py-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
