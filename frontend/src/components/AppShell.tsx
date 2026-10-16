import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, ChevronRight } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/pages/Roles/permissions";
import { useTenant } from "@/tenant";
import { salonLogoUrl } from "@/brand";
import { adminBreadcrumbLabel } from "@/pages/Dashboard/breadcrumb";
import { OrgLocationSwitcher } from "@/components/OrgLocationSwitcher";
import { ViewToggle } from "@/list-view";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useT } from "@/i18n/LanguageContext";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { org, scopeLabel } = useTenant();
  const { allowedNav } = usePermissions();
  const navigate = useNavigate();
  const t = useT();

  const allowed = user?.role === "SUPER_ADMIN" ? "all" : allowedNav;
  const breadcrumb = adminBreadcrumbLabel(pathname);

  return (
    <div className={cn("min-h-dvh bg-background", open && "max-lg:overflow-hidden")}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(16.5rem,100%)] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src={salonLogoUrl(org.logo)} alt={org.name} width={36} height={36} className="size-9 shrink-0 object-contain" />
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
                <LogOut /> {t("Sign out")}
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="w-full rounded-xl">
              <Link to="/login">{t("Log in")}</Link>
            </Button>
          )}
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[16.5rem]">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-6 sm:py-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t("Open navigation")}
          >
            <Menu className="size-4" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium sm:hidden">{t(breadcrumb)}</p>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <span className="truncate">{org.name}</span>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="truncate">{scopeLabel}</span>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="truncate font-medium text-foreground">{t(breadcrumb)}</span>
          </nav>
          <div className="flex w-full min-w-0 items-center justify-end gap-1.5 sm:ml-auto sm:w-auto sm:gap-2">
            <OrgLocationSwitcher />
            <LanguageSwitcher compact className="max-w-[7.5rem] shrink-0 sm:max-w-none" />
            <ViewToggle className="shrink-0" />
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground md:flex">
              {(user?.name ?? "Admin").slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className={cn(pathname === "/settings" ? "px-0 py-0" : "mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8")}>
          {children}
        </main>
      </div>
    </div>
  );
}
