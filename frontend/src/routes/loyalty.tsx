import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useLoyaltySettings } from "@/lib/loyalty-settings";

const title = "Loyalty — Luxe Salon CRM";
const description = "Program rules drive POS earn/redeem. The ledger is written only at checkout.";

export const Route = createFileRoute("/loyalty")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LoyaltyLayout,
});

const TABS = [
  { to: "/loyalty/qr", label: "Outlet QR" },
  { to: "/loyalty/wheel", label: "Prize wheel" },
  { to: "/loyalty/partners", label: "Partners" },
  { to: "/loyalty/ledger", label: "Point ledger" },
] as const;

function LoyaltyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings } = useLoyaltySettings();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        QR loyalty is check-in only (no booking). POS still uses <strong>{settings.name}</strong>: {settings.pointsPerUnit}{" "}
        pt / ₹{settings.earnUnitRupees}. Stamp cards, the prize wheel and spend points run from the outlet QR.
      </p>
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => {
          const active = pathname === t.to || pathname.startsWith(`${t.to}/`);
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
      <Outlet />
    </div>
  );
}
