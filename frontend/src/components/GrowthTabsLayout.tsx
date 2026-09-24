import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveLoyaltyRule } from "@/lib/loyalty-rules";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const GROWTH_TABS = [
  { to: "/growth", label: "Overview" },
  { to: "/loyalty/qr", label: "Outlet QR" },
  { to: "/coupons", label: "Coupons" },
  { to: "/prize-wheel", label: "Prize wheel" },
  { to: "/scratch-card", label: "Scratch card" },
  { to: "/loyalty/partners", label: "Partners" },
  { to: "/loyalty/ledger", label: "Point ledger" },
] as const;

function isTabActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function GrowthTabsLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { orgId, locationId } = useTenant();
  const { allRows } = useData();
  const orgRow = (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId));
  const programs = (allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === String(orgId));
  const settings = resolveLoyaltyRule(programs, orgRow, {
    locationId: locationId === "all" ? "" : String(locationId),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        QR loyalty is check-in only (no booking). POS still uses <strong>{settings.name}</strong>: {settings.pointsPerUnit}{" "}
        pt / ₹{settings.earnUnitRupees}. Stamp cards, the prize wheel and spend points run from the outlet QR.
      </p>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
        {GROWTH_TABS.map((t) => {
          const active = isTabActive(pathname, t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
