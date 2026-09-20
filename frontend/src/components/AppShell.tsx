import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, ChevronRight } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant";
import { BRAND_LOGO } from "@/lib/brand";
import { adminBreadcrumbLabel } from "@/lib/admin/breadcrumb";
import { OrgLocationSwitcher } from "@/components/OrgLocationSwitcher";
import { ViewToggle } from "@/lib/list-view";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { org, scopeLabel } = useTenant();
  const { allowedNav } = usePermissions();
  const navigate = useNavigate();

  const allowed = user?.role === "SUPER_ADMIN" ? "all" : allowedNav;
  const breadcrumb = adminBreadcrumbLabel(pathname);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[16.5rem] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src={BRAND_LOGO} alt="Krios" width={36} height={36} className="size-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="font-display truncate text-[15px] leading-tight font-semibold text-sidebar-foreground">
              {org.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{org.domain || scopeLabel} · Krios</p>
          </div>
        </div>

        <AdminNav allowed={allowed} onNavigate={() => setOpen(false)} />

        <div className="border-t border-sidebar-border px-4 py-4">
          {user ? (
            <div className="space-y-2">
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => {
                  signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut /> Sign out
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="w-full rounded-xl">
              <Link to="/login">Log in</Link>
            </Button>
          )}
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[16.5rem]">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <span>{org.name}</span>
            <ChevronRight className="size-3.5" />
            <span>{scopeLabel}</span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-foreground">{breadcrumb}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <OrgLocationSwitcher />
            <ViewToggle />
            <span className="hidden size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground sm:flex">
              {(user?.name ?? "Admin").slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
