import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Gift,
  LogOut,
  MapPin,
  QrCode,
  Star,
  Store,
  TicketPercent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerSession } from "@/lib/customer";
import { useData } from "@/lib/store";
import { getCustomerShopVisits } from "@/lib/customers/customer-shops";

export function MyShopsPage() {
  const navigate = useNavigate();
  const { allRows } = useData();
  const { customer, ready, signOut } = useCustomerSession();

  const shops = useMemo(
    () => (customer ? getCustomerShopVisits(allRows, customer.phone) : []),
    [allRows, customer],
  );

  const totals = useMemo(
    () => ({
      shops: shops.length,
      points: shops.reduce((sum, s) => sum + s.points, 0),
      coupons: shops.reduce((sum, s) => sum + s.couponCount, 0),
    }),
    [shops],
  );

  useEffect(() => {
    if (ready && !customer) void navigate({ to: "/login" });
  }, [ready, customer, navigate]);

  if (!ready || !customer) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Back to nearby salons">
              <Link to="/nearby">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <p className="font-display text-lg leading-tight font-semibold">My shops & rewards</p>
              <p className="text-xs text-muted-foreground">{customer.phone}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              void navigate({ to: "/login" });
            }}
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold">Hi {customer.name.split(" ")[0]} 👋</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every salon you&apos;ve checked in or booked at — with your points, stamp progress and active coupons for
            that store.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryStat icon={Store} label="Shops visited" value={String(totals.shops)} />
            <SummaryStat icon={Star} label="Total points" value={totals.points.toLocaleString("en-IN")} />
            <SummaryStat icon={TicketPercent} label="Active coupons" value={String(totals.coupons)} />
          </div>
        </section>

        {shops.length === 0 ? (
          <section className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <Store className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No shops yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Book a salon nearby or scan a QR at the counter to start earning rewards.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/nearby">Find salons near me</Link>
            </Button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {shops.map((shop) => (
              <article key={shop.key} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{shop.orgName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0 text-primary" />
                      {shop.locationName}
                      {shop.city ? ` · ${shop.city}` : ""}
                    </p>
                    {shop.address ? <p className="mt-1 text-xs text-muted-foreground">{shop.address}</p> : null}
                  </div>
                  <Badge variant="secondary">{shop.tier}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Points" value={shop.points.toLocaleString("en-IN")} />
                  <MiniStat label="Stamps" value={`${shop.stampsCurrent}/${shop.stampsRequired}`} />
                  <MiniStat label="Visits" value={String(shop.visits)} />
                </div>

                {shop.lastVisit ? (
                  <p className="mt-3 text-xs text-muted-foreground">Last visit · {shop.lastVisit}</p>
                ) : null}

                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Gift className="size-4 text-primary" />
                    <p className="text-sm font-medium">
                      {shop.couponCount > 0
                        ? `${shop.couponCount} active coupon${shop.couponCount === 1 ? "" : "s"}`
                        : "No active coupons"}
                    </p>
                  </div>
                  {shop.coupons.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {shop.coupons.map((c) => (
                        <li key={c.id} className="rounded-md bg-background px-2.5 py-2 text-sm">
                          <p className="font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.valueLabel}
                            {c.expiresAt ? ` · Expires ${c.expiresAt}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Check in on your next visit to earn stamps, spins and offers.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/nearby">Book again</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/qr/$locationId" params={{ locationId: shop.locationId }}>
                      <QrCode /> Check in
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-display mt-2 text-2xl leading-tight font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-center">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
