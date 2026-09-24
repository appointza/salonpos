import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Gift,
  IndianRupee,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCustomerDetail, membershipAvailabilityLabel } from "@/lib/customers/customer-detail";
import { useApi } from "@/hooks/useApi";
import { useTenant } from "@/lib/tenant";
import { toRow } from "@/lib/entity-row";
import type { Row } from "@/lib/store";
import { customerService } from "@/services/customer.service";

export function CustomerDetailPage() {
  const { customerId } = useParams({ from: "/_app/customers/$customerId" });
  const { allRows, applyCache } = useApi();
  const { org } = useTenant();
  const detail = buildCustomerDetail(allRows, customerId);
  const [loyaltyRows, setLoyaltyRows] = useState<Row[] | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<{ balance: number; earned: number; redeemed: number } | null>(null);

  useEffect(() => {
    const oid = Number(org.orgId);
    const cid = Number(customerId);
    if (!oid || !cid || !detail) {
      setLoyaltyRows(null);
      setLoyaltyPoints(null);
      return;
    }
    let cancelled = false;
    void customerService.loyaltySummary({ orgId: oid, customerId: cid }).then((res) => {
      if (cancelled) return;
      if (res.errorMessage) {
        setLoyaltyRows(null);
        setLoyaltyPoints(null);
        return;
      }
      const txs = (res.transactions ?? []).map((t) => toRow(t));
      setLoyaltyRows(txs);
      setLoyaltyPoints({ balance: res.points, earned: res.earned, redeemed: res.redeemed });
      applyCache((prev) => ({
        ...prev,
        customers: (prev["customers"] ?? []).map((c) =>
          String(c.id) === String(cid) ? { ...c, points: res.points } : c,
        ),
        loyaltyTransactions: [
          ...txs,
          ...(prev["loyaltyTransactions"] ?? []).filter(
            (t) => String(t["customerId"]) !== String(cid),
          ),
        ],
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [org.orgId, customerId, applyCache]);

  if (!detail) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Customer {customerId} was not found.</p>
        <Button variant="outline" asChild>
          <Link to="/customers">
            <ArrowLeft /> Back to customers
          </Link>
        </Button>
      </div>
    );
  }

  const { customer, points, memberships, loyaltyTransactions, invoices, appointments, checkins, wheelSpins, scratchPlays, offerRedemptions, partnerCoupons, products, feedback } =
    detail;
  const pointsDisplay = loyaltyPoints ?? points;
  const loyaltyLedger = loyaltyRows ?? loyaltyTransactions;
  const unclaimedRewards = [
    ...wheelSpins
      .filter((w) => String(w["status"]) === "Pending")
      .map((w) => ({ id: `w-${w.id}`, primary: `Wheel · ${String(w["label"] ?? "Prize")}` })),
    ...scratchPlays
      .filter((w) => String(w["status"]) === "Pending")
      .map((w) => ({ id: `s-${w.id}`, primary: `Scratch · ${String(w["label"] ?? "Prize")}` })),
  ];
  const upcoming = appointments.filter((a) => String(a["status"]) !== "Completed" && String(a["status"]) !== "Cancelled");
  const past = appointments.filter((a) => String(a["status"]) === "Completed" || String(a["status"]) === "Cancelled");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
            <Link to="/customers">
              <ArrowLeft className="size-4" /> Customers
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight">{String(customer["name"])}</h1>
              <Badge variant="secondary">{String(customer["tier"] ?? "Silver")}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{String(customer.id)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(customer["phone"] ?? "—")}
              {customer["email"] ? ` · ${String(customer["email"])}` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/pos">Open POS</Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Star}
          label="Loyalty points"
          value={pointsDisplay.balance.toLocaleString("en-IN")}
          hint={`+${pointsDisplay.earned} earned · −${pointsDisplay.redeemed} redeemed`}
        />
        <StatCard icon={IndianRupee} label="Wallet" value={`₹${Number(customer["walletBalance"] ?? 0).toLocaleString("en-IN")}`} hint="Prepaid balance" />
        <StatCard icon={RotateCcw} label="Visits" value={String(customer["totalVisits"] ?? customer["visits"] ?? 0)} hint={`Stamps ${Number(customer["stampsCurrent"] ?? 0)} · Last ${String(customer["lastVisit"] ?? "—")}`} />
        <StatCard icon={Gift} label="Packages" value={String(memberships.filter((m) => m.isLive).length)} hint={`${memberships.length} total enrollment${memberships.length === 1 ? "" : "s"}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title="Profile" icon={User}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Gender" value={String(customer["gender"] ?? "—")} />
            <Field label="Birthday" value={String(customer["birthday"] ?? "—")} />
            <Field label="Anniversary" value={String(customer["anniversary"] ?? "—")} />
            <Field label="Household" value={String(customer["household"] ?? "—")} />
            <Field label="Outlet" value={String(customer["outlet"] ?? "—")} />
            <Field label="Referral code" value={String(customer["referralCode"] ?? "—")} />
            <Field label="Marketing consent" value={String(customer["marketingConsent"] ?? "—")} />
            <Field label="Last wheel prize" value={String(customer["lastWheelPrize"] ?? "—")} />
          </dl>
          {customer["notes"] ? (
            <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{String(customer["notes"])}</p>
          ) : null}
        </Section>

        <Section title="Packages & memberships" icon={Package}>
          {memberships.length === 0 ? (
            <Empty text="No membership enrolled." />
          ) : (
            <div className="space-y-3">
              {memberships.map((m) => (
                <div key={String(m.enrollment.id)} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{String(m.plan?.["name"] ?? m.enrollment["plan"] ?? m.enrollment.id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(m.enrollment.id)} · {String(m.enrollment["startDate"] ?? "")} → {String(m.enrollment["endDate"] ?? "")}
                      </p>
                    </div>
                    <Badge variant={m.isLive ? "default" : "secondary"}>{m.isLive ? "Active" : String(m.enrollment["status"] ?? "Inactive")}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary">{membershipAvailabilityLabel(m)}</p>
                  {m.plan?.["benefits"] ? <p className="mt-1 text-sm text-muted-foreground">{String(m.plan["benefits"])}</p> : null}
                  {m.plan?.["includedMatch"] ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Included services match: <span className="font-medium">{String(m.plan["includedMatch"])}</span>
                      {Number(m.plan["extraDiscountPct"] ?? 0) > 0 ? ` · ${String(m.plan["extraDiscountPct"])}% off matching add-ons` : ""}
                    </p>
                  ) : null}
                  {m.usages.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                      {m.usages.map((u) => (
                        <li key={String(u.id)} className="flex justify-between gap-2 text-muted-foreground">
                          <span>
                            {String(u["serviceName"] ?? "Service")} × {Number(u["quantity"] ?? 1)}
                          </span>
                          <span>{String(u["usedOn"] ?? u["createdon"] ?? "")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No package usage recorded yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Loyalty ledger" icon={Star}>
        {loyaltyLedger.length === 0 ? (
          <Empty text="No loyalty transactions yet — points are added when you complete a sale on POS." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loyaltyLedger.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell className="text-xs">{String(t["createdon"] ?? "—")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{String(t["type"])}</Badge>
                    </TableCell>
                    <TableCell>
                      {String(t["type"]) === "Redeem" ? "−" : "+"}
                      {Number(t["points"] ?? 0)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {String(t["balanceBefore"])} → {String(t["balanceAfter"])}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{String(t["referenceId"] ?? t["invoiceId"] ?? "—")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{String(t["reason"] ?? t["source"] ?? "")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Upcoming appointments" icon={CalendarDays}>
          {upcoming.length === 0 ? (
            <Empty text="No upcoming bookings." />
          ) : (
            <ItemList
              items={upcoming.map((a) => ({
                id: String(a.id),
                primary: `${String(a["service"] ?? "Service")} · ${String(a["date"] ?? "")} ${String(a["time"] ?? "")}`,
                secondary: `${String(a["staff"] ?? "—")} · ${String(a["status"] ?? "")} · ${String(a["outlet"] ?? "")}`,
              }))}
            />
          )}
        </Section>

        <Section title="Visit history" icon={CalendarDays}>
          {past.length === 0 && checkins.length === 0 ? (
            <Empty text="No completed visits or check-ins." />
          ) : (
            <div className="space-y-4">
              {past.length > 0 ? (
                <ItemList
                  items={past.map((a) => ({
                    id: String(a.id),
                    primary: `${String(a["service"] ?? "Service")} · ${String(a["date"] ?? "")}`,
                    secondary: `${String(a["staff"] ?? "—")} · ${String(a["status"] ?? "")}`,
                  }))}
                />
              ) : null}
              {checkins.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">QR check-ins</p>
                  <ItemList
                    items={checkins.map((c) => ({
                      id: String(c.id),
                      primary: `${String(c["visitAt"] ?? "")} · ${String(c["status"] ?? "")}`,
                      secondary: String(c["rewardEarned"] ?? c["verification"] ?? ""),
                    }))}
                  />
                </div>
              ) : null}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Invoices & billing" icon={Receipt}>
          {invoices.length === 0 ? (
            <Empty text="No invoices yet." />
          ) : (
            <ItemList
              items={invoices.map((inv) => ({
                id: String(inv.id),
                primary: `${String(inv.id)} · ₹${Number(inv["total"] ?? 0).toLocaleString("en-IN")}`,
                secondary: `${String(inv["date"] ?? "")} · ${String(inv["items"] ?? "")} · ${String(inv["status"] ?? "")}`,
              }))}
            />
          )}
        </Section>

        <Section title="Products purchased" icon={Package}>
          {products.length === 0 ? (
            <Empty text="No retail products on file." />
          ) : (
            <ItemList
              items={products.map((p) => ({
                id: String(p.id),
                primary: `${String(p["skuName"] ?? p["skuId"] ?? p.id)} × ${Number(p["quantity"] ?? p["qtyOut"] ?? 1)}`,
                secondary: `${String(p["date"] ?? "")} · ${String(p["type"])} · ${String(p["invoiceId"] ?? "")}`,
              }))}
            />
          )}
        </Section>
      </div>

      <Section title="Rewards to claim" icon={Gift}>
        {unclaimedRewards.length === 0 ? (
          <Empty text="No pending prize. Scratch and wheel discounts show here until they are applied on the next POS bill." />
        ) : (
          <ItemList
            items={unclaimedRewards.map((r) => ({
              id: r.id,
              primary: r.primary,
              secondary: "Pending · claim on the next POS bill",
            }))}
          />
        )}
      </Section>

      {(offerRedemptions.length > 0 || partnerCoupons.length > 0 || wheelSpins.length > 0 || scratchPlays.length > 0 || feedback.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {offerRedemptions.length > 0 ? (
            <Section title="QR offers" icon={Gift}>
              <ItemList
                items={offerRedemptions.map((r) => ({
                  id: String(r.id),
                  primary: String(r["offerTitle"] ?? r["offerId"] ?? "Offer"),
                  secondary: `${String(r["status"] ?? "")} · ${String(r["issuedAt"] ?? "")}${r["invoiceId"] ? ` · ${String(r["invoiceId"])}` : ""}`,
                }))}
              />
            </Section>
          ) : null}
          {partnerCoupons.length > 0 ? (
            <Section title="Partner coupons" icon={Gift}>
              <ItemList
                items={partnerCoupons.map((c) => ({
                  id: String(c.id),
                  primary: String(c["offer"] ?? c["couponCode"] ?? "Coupon"),
                  secondary: `${String(c["status"] ?? "")} · ${String(c["direction"] ?? "")} · ${String(c["issuedAt"] ?? "")}`,
                }))}
              />
            </Section>
          ) : null}
          {scratchPlays.length > 0 ? (
            <Section title="Scratch card" icon={Sparkles}>
              <ItemList
                items={scratchPlays.map((w) => ({
                  id: String(w.id),
                  primary: String(w["label"] ?? "Prize"),
                  secondary: `${String(w["status"] ?? "")} · ${String(w["createdAt"] ?? "")} · ${String(w["rewardType"] ?? "")}`,
                }))}
              />
            </Section>
          ) : null}
          {wheelSpins.length > 0 ? (
            <Section title="Prize wheel" icon={Sparkles}>
              <ItemList
                items={wheelSpins.map((w) => ({
                  id: String(w.id),
                  primary: String(w["label"] ?? "Prize"),
                  secondary: `${String(w["createdAt"] ?? w["createdon"] ?? "")} · ${String(w["rewardType"] ?? "")}`,
                }))}
              />
            </Section>
          ) : null}
          {feedback.length > 0 ? (
            <Section title="Feedback" icon={Phone}>
              <ItemList
                items={feedback.map((f) => ({
                  id: String(f.id),
                  primary: `${String(f["rating"] ?? "—")}★ · ${String(f["date"] ?? "")}`,
                  secondary: `${String(f["comment"] ?? "")} · ${String(f["status"] ?? "")}`,
                }))}
              />
            </Section>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {org.name} · Profile updated {String(customer["updatedon"] ?? customer["createdon"] ?? "—")}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-2xl tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function ItemList({ items }: { items: { id: string; primary: string; secondary: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-border px-3 py-2.5">
          <p className="text-sm font-medium">{item.primary}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.secondary}</p>
        </li>
      ))}
    </ul>
  );
}
