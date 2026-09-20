import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Gift,
  IndianRupee,
  Megaphone,
  Receipt,
  Settings,
  Star,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { GrowthTabsLayout } from "@/components/GrowthTabsLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCouponDefinitions } from "@/lib/coupons/coupon-engine";
import { useLoyaltySettings } from "@/lib/loyalty-settings";
import { listLoyaltyCoupons } from "@/lib/rewards/loyalty-coupons";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

const CRM_MODULES = [
  {
    title: "Loyalty management",
    purpose: "Configure program, view balances, redemption history",
    to: "/loyalty/ledger",
    icon: Star,
  },
  {
    title: "Gift coupon / scheme",
    purpose: "Create campaigns, issue codes, track usage",
    to: "/coupons",
    icon: TicketPercent,
  },
  {
    title: "QR offers",
    purpose: "Check-in promotions and segment-based deals",
    to: "/offers",
    icon: Megaphone,
  },
  {
    title: "Gift voucher",
    purpose: "Prepaid stored value (separate from discount coupons)",
    to: "/coupons",
    icon: Wallet,
    hint: "Issue from Coupons → Vouchers tab",
  },
] as const;

const POS_STEPS = [
  "Add items → attach customer (required for points redemption).",
  "Loyalty: redeem points → discount spread on eligible lines.",
  "Coupon: scan or type code → validate rules → discount on eligible lines.",
  "Save bill → points adjusted and coupon marked consumed.",
] as const;

export function GrowthGuidePage() {
  const { orgId, locationId, org } = useTenant();
  const { allRows } = useData();
  const { settings } = useLoyaltySettings();

  const scope = { orgId, locationId: locationId === "all" ? undefined : locationId };

  const stats = useMemo(() => {
    const customers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId);
    const withPoints = customers.filter((c) => Number(c["points"] ?? 0) > 0).length;
    const schemes = listCouponDefinitions(allRows, scope).filter((c) => String(c.status) === "Active").length;
    const issued = listLoyaltyCoupons(allRows, scope);
    const activeCoupons = issued.filter((c) => c.status === "Active").length;
    const ledger = (allRows["loyaltyTransactions"] ?? []).filter((t) => String(t["orgId"] ?? orgId) === orgId);
    return { withPoints, schemes, activeCoupons, ledgerMoves: ledger.length };
  }, [allRows, orgId, scope]);

  return (
    <GrowthTabsLayout>
      <div className="space-y-8">
        <header className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="font-display text-2xl font-semibold">Loyalty vs coupon</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>Loyalty</strong> is a customer wallet of points. <strong>Coupon</strong> is a promotional ticket
                with its own rules. Both reduce the bill — but loyalty is an ongoing balance; a coupon is a coded offer
                (sometimes created from points).
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {org.name}
            </Badge>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <ConceptCard
            icon={Star}
            title="Loyalty (reward points)"
            tagline="Long-term retention — shop more, earn points, use points on next visit."
            rules={[
              "Customer must be identified (mobile / customer id).",
              "Points earned on eligible sales (coupon-discounted lines can be excluded).",
              "Redeemed at POS as rupee discount (points ÷ settlement reward value).",
              "Redemption can require OTP when enabled in settings.",
              "Earn rate, redeem rate, expiry and enable/disable live in Application Settings.",
            ]}
            actions={[
              { to: "/loyalty/ledger", label: "Point ledger" },
              { to: "/settings", label: "Application settings" },
            ]}
          />
          <ConceptCard
            icon={TicketPercent}
            title="Coupon (voucher code)"
            tagline="Targeted promotions — campaigns, birthday offers, settlement gifts, credit notes."
            rules={[
              "Cashier or CRM enters a code at POS (or CRM issues it).",
              "Validates dates, location, min bill, usage limits and eligible products.",
              "Discount can be flat ₹, % or slab-based on bill range.",
              "May not apply on lines that already have scheme / additional discount.",
              "On bill save the code is marked used and linked to that invoice.",
            ]}
            actions={[
              { to: "/coupons", label: "Coupon schemes" },
              { to: "/pos", label: "POS billing" },
            ]}
          />
        </div>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold">How they relate at POS</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Link</th>
                  <th className="pb-2 font-medium">Business meaning</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <CompareRow link="Separate at POS" meaning="Cashier uses either points or coupon code — different flows." />
                <CompareRow
                  link="Points → coupon"
                  meaning="Shop can let customer convert loyalty points into a printable coupon, then redeem like any other code."
                />
                <CompareRow
                  link="Not the same balance"
                  meaning="Coupon value ≠ loyalty points; coupon is an issued instrument, loyalty is an account balance."
                />
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Customers with points" value={String(stats.withPoints)} />
          <StatCard label="Active coupon schemes" value={String(stats.schemes)} />
          <StatCard label="Issued coupons (active)" value={String(stats.activeCoupons)} />
          <StatCard label="Ledger transactions" value={String(stats.ledgerMoves)} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Your loyalty settings</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">
                <Settings className="size-4" /> Edit in settings
              </Link>
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Active program: <strong>{settings.name}</strong> — used by POS earn / redeem.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SettingItem label="Earn rate" value={`${settings.pointsPerUnit} pt / ₹${settings.earnUnitRupees}`} />
            <SettingItem label="Redeem rate" value={`1 pt = ₹${settings.rupeesPerPoint}`} />
            <SettingItem label="Min spend to earn" value={settings.minSpend ? `₹${settings.minSpend}` : "None"} />
            <SettingItem label="Points expiry" value={`${settings.expiryMonths} months`} />
          </dl>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">CRM modules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Separate products in the menu — coupons are not inside loyalty except when points are turned into coupons.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CRM_MODULES.map((m) => (
              <Link
                key={m.title}
                to={m.to}
                className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.purpose}</p>
                    {"hint" in m && m.hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
                    ) : null}
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                      Open <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">At the counter (POS)</h2>
          </div>
          <ol className="mt-4 space-y-3">
            {POS_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Button className="mt-5" asChild>
            <Link to="/pos">
              <IndianRupee className="size-4" /> Open POS
            </Link>
          </Button>
        </section>
      </div>
    </GrowthTabsLayout>
  );
}

function ConceptCard({
  icon: Icon,
  title,
  tagline,
  rules,
  actions,
}: {
  icon: typeof Star;
  title: string;
  tagline: string;
  rules: string[];
  actions: { to: string; label: string }[];
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-4 space-y-2">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2 text-sm text-muted-foreground">
            <Gift className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.to} variant="outline" size="sm" asChild>
            <Link to={a.to}>{a.label}</Link>
          </Button>
        ))}
      </div>
    </article>
  );
}

function CompareRow({ link, meaning }: { link: string; meaning: string }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2.5 pr-4 font-medium text-foreground">{link}</td>
      <td className="py-2.5">{meaning}</td>
    </tr>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
