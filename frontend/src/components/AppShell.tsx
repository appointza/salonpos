import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { LogOut, Menu, Search, ChevronRight } from "lucide-react";
import { navSections } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant";
import { OrgLocationSwitcher } from "@/components/OrgLocationSwitcher";
import { ViewToggle } from "@/lib/list-view";

function NavIcon({ name }: { name: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Circle;
  return <Cmp className="size-4 shrink-0" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const { user, signOut } = useAuth();
  const { org, scopeLabel } = useTenant();
  const { allowedNav } = usePermissions();
  const navigate = useNavigate();

  const allowed = user?.role === "SUPER_ADMIN" ? "all" : allowedNav;
  const q = filter.trim().toLowerCase();
  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          (allowed === "all" || allowed.includes(item.to)) && (!q || item.label.toLowerCase().includes(q)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const current = navSections
    .flatMap((s) => s.items)
    .find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[16.5rem] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span
            className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
            style={{ background: org.brandColor }}
          >
            {org.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-[15px] leading-tight font-semibold text-sidebar-foreground">
              {org.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{org.domain || "workspace"}</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search menu"
              className="h-9 rounded-xl bg-card pl-9 text-sm"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-5 px-3 pb-6">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          active &&
                            "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                        )}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

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
            <span className="font-medium text-foreground">{current?.label ?? "Overview"}</span>
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
