import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/utils/utils";
import { resolveLoyaltyRule } from "@/pages/Loyalty/loyalty-rules";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export const GROWTH_TABS = [
  { to: "/growth", label: "Overview" },
  { to: "/growth/claim", label: "Claim points" },
  { to: "/loyalty/qr", label: "Outlet QR" },
  { to: "/coupons", label: "Coupons" },
  { to: "/prize-wheel", label: "Guest prizes" },
  { to: "/loyalty/partners", label: "Partners" },
  { to: "/loyalty/ledger", label: "Point ledger" },
] as const;

function isTabActive(pathname: string, to: string) {
  if (to === "/growth") return pathname === "/growth" || pathname === "/growth/";
  if (to === "/prize-wheel") {
    return pathname === "/prize-wheel" || pathname.startsWith("/prize-wheel/") || pathname.startsWith("/scratch-card");
  }
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
        QR loyalty is check-in only (no booking). POS still uses <strong>{settings.name}</strong>:{" "}
        {settings.pointsPerUnit} pt / ₹{settings.earnUnitRupees}. Stamp cards, guest prizes and spend points run from
        the outlet QR.
      </p>
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 [-webkit-overflow-scrolling:touch]">
        {GROWTH_TABS.map((t) => {
          const active = isTabActive(pathname, t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
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
