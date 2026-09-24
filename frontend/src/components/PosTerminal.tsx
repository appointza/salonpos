import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck, Plus, Minus, Trash2, Receipt, Send, X, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection, useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { collapseCustomersByPhone, findCustomerByPhoneInOrg, normalizePhone } from "@/lib/customers/customer-lookup";
import { isValidPhone } from "@/lib/customers/customer-service";
import { rowToEntity, toRow } from "@/lib/entity-row";
import { readRewardDistribution, rollCustomerTier } from "@/lib/reward-distribution";
import { customerService } from "@/services/customer.service";
import { getCustomerLoyaltyBalance } from "@/lib/loyalty/loyalty-service";
import { useWhatsAppSender } from "@/lib/whatsapp";
import { usePostSale, useSaleQuote, type BillLine } from "@/lib/pos";
import type { RewardRefs } from "@/lib/rewards/reward-quote";
import { getCustomerRewardOptions, rewardCustomerIds } from "@/lib/rewards/reward-quote";
import { resolveCustomerRow, resolveServiceRow } from "@/lib/appointments/appointment-resolve";
import { includedVisitProgress } from "@/lib/membership";
import { useStockService } from "@/lib/stock";
import { recipesForService } from "@/lib/service-recipe";
import type { InventoryMissingProduct } from "@/model/inventory";
import { staffIdFromName } from "@/lib/hr";
import { PosCouponInput } from "@/components/PosCouponInput";
import { validateCouponCodeAtPos } from "@/lib/coupons/coupon-pos";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function PosTerminal({ prefill, onBilled }: { prefill?: Row | null; onBilled?: () => void }) {
  const { org, location, locationId, scopeLabel } = useTenant();
  const { allRows, applyCache } = useData();
  const { rows: customers } = useCollection("customers");
  const { rows: services } = useCollection("services");
  const { rows: products } = useCollection("inventory");
  const { rows: staff } = useCollection("staff");
  const postSale = usePostSale();
  const stock = useStockService();
  const { send, isConfigured } = useWhatsAppSender();

  const [phone, setPhone] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [pointsSummary, setPointsSummary] = useState<{
    before: number;
    earned: number;
    redeemed: number;
    after: number;
  } | null>(null);
  const orgCustomers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === String(org.orgId));
  const prefillCustomer = prefill ? resolveCustomerRow(prefill, orgCustomers.length ? orgCustomers : customers) : null;
  const prefillStaffId = prefill
    ? String(prefill["staffId"] || staffIdFromName(staff, String(prefill["staff"] ?? "")) || "")
    : "";
  const [customer, setCustomer] = useState<Row | null>(prefillCustomer ?? null);
  const [stylist, setStylist] = useState(prefillStaffId);
  const [serviceQuery, setServiceQuery] = useState("");
  const [tab, setTab] = useState<"services" | "products">("services");
  const [cart, setCart] = useState<BillLine[]>(() => {
    if (!prefill) return [];
    const s = resolveServiceRow(prefill, services);
    if (!s) return [];
    return [
      {
        id: String(s.id),
        kind: "service",
        name: String(s["name"]),
        price: Number(s["price"] ?? 0),
        gstRate: Number(s["gstRate"] ?? 18),
        qty: 1,
        commission: Number(s["commission"] ?? 10),
        staff: String(prefill["staff"] ?? ""),
        staffId: String(prefill["staffId"] || staffIdFromName(staff, String(prefill["staff"] ?? "")) || ""),
      },
    ];
  });
  const [discount, setDiscount] = useState(0);
  const [redeem, setRedeem] = useState(0);
  const [rewards, setRewards] = useState<RewardRefs>({});
  const [couponCodes, setCouponCodes] = useState<string[]>([]);
  const [payment, setPayment] = useState("UPI");
  const [bill, setBill] = useState<Row | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  const matches = useMemo(() => {
    const q = phone.replace(/\s|\+/g, "").trim();
    if (!q) return [];
    const orgCustomers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === String(org.orgId));
    const hits = orgCustomers.filter((c) => {
      const p = String(c["phone"] ?? "").replace(/\s|\+/g, "");
      return p.includes(q) || String(c["name"] ?? "").toLowerCase().includes(phone.trim().toLowerCase());
    });
    return collapseCustomersByPhone(hits).slice(0, 6);
  }, [allRows, org.orgId, phone]);

  const catalogue = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (tab === "services") {
      return services
        .filter((s) => String(s["active"] ?? "Yes") !== "No")
        .filter((s) => !q || `${s["name"]} ${s["category"]}`.toLowerCase().includes(q));
    }
    return products.filter((p) => !q || `${p["name"]} ${p["brand"]}`.toLowerCase().includes(q));
  }, [services, products, serviceQuery, tab]);

  const { quote } = useSaleQuote(
    {
      customer,
      lines: cart,
      discount,
      pointsRedeemed: redeem,
      rewards,
      couponCodes,
      paymentMethod: payment,
      staffId: stylist,
    },
    allRows,
    { orgId: org.orgId, locationId },
  );

  useEffect(() => {
    if (!customer || couponCodes.length === 0) return;
    const stillValid = couponCodes.filter((code) => {
      const status = validateCouponCodeAtPos({
        db: allRows,
        customer,
        lines: cart,
        orgId: org.orgId,
        locationId,
        paymentMethod: payment,
        otherDiscount: discount,
        membershipDiscount: quote.membershipDiscount,
        staffId: stylist,
        code,
        alreadyAppliedCodes: couponCodes.filter((c) => c !== code),
        at: new Date(),
      });
      return status.ok;
    });
    if (stillValid.length !== couponCodes.length) {
      setCouponCodes(stillValid);
      toast.message("Coupon removed — cart or payment no longer qualifies");
    }
  }, [cart, discount, payment, stylist, customer, allRows, org.orgId, locationId, quote.membershipDiscount]);
  const rewardOptions = useMemo(
    () =>
      customer
        ? getCustomerRewardOptions(allRows, String(customer.id), rewardCustomerIds(allRows, customer))
        : { wheelSpins: [], scratchPlays: [], offers: [], partners: [] },
    [customer, allRows],
  );
  const membership = quote.membership;
  const membershipPlan = quote.plan;
  const membershipBenefit = quote.benefit;
  const membershipDiscount = quote.membershipDiscount;
  const loyalty = quote.rule;

  useEffect(() => {
    if (!customer) return;
    const oid = Number(org.orgId);
    const cid = Number(customer.id);
    if (!oid || !cid) return;
    let cancelled = false;
    void customerService.loyaltySummary({ orgId: oid, customerId: cid }).then((res) => {
      if (cancelled || res.errorMessage) return;
      setCustomer((prev) =>
        prev && String(prev.id) === String(cid) ? { ...prev, points: Number(res.points ?? 0) } : prev,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [customer?.id, org.orgId]);
  const visitProgress = membership
    ? includedVisitProgress(membership, allRows["membershipPlans"] ?? [], allRows["membershipUsage"] ?? [])
    : null;
  const [missing, setMissing] = useState<InventoryMissingProduct[]>([]);

  useEffect(() => {
    if (cart.length === 0) {
      setMissing([]);
      return;
    }
    let cancelled = false;
    void stock.checkAvailability(cart).then((res) => {
      if (!cancelled) setMissing(res.missing ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [cart, stock.checkAvailability]);

  function addLine(item: Row, kind: "service" | "product") {
    const id = String(item.id);
    if (kind === "product" && stock.remaining(id) <= 0) return void toast.error("Out of stock");
    const inCart = cart.find((l) => l.id === id)?.qty ?? 0;
    if (kind === "product" && inCart + 1 > stock.remaining(id)) {
      const have = stock.remaining(id);
      return void toast.error(`Only ${have} units available. You cannot sell ${inCart + 1} units.`);
    }
    if (kind === "service") {
      const next = cart.some((l) => l.id === id)
        ? cart.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...cart, { id, kind, name: String(item["name"]), price: 0, gstRate: 0, qty: 1, commission: 0, staff: "", staffId: "" }];
      void stock.checkAvailability(next).then((res) => {
        if (res.missing?.length) {
          toast.warning(res.missing.map((m) => `${m.name} is missing. Need ${m.need}, have ${m.have}.`).join(" "));
        }
      });
    }
    const person = staff.find((s) => String(s.id) === stylist);
    const rate = Number(person?.["commissionRate"] ?? item["commission"] ?? (kind === "product" ? 5 : 10));
    setCart((prev) => {
      const found = prev.find((l) => l.id === id);
      if (found) return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        {
          id,
          kind,
          name: String(item["name"] ?? "Item"),
          price: Number(kind === "service" ? (item["price"] ?? 0) : (item["sellPrice"] ?? 0)),
          gstRate: Number(item["gstRate"] ?? 18),
          qty: 1,
          commission: rate,
          staff: String(person?.["name"] ?? ""),
          staffId: stylist,
        },
      ];
    });
  }

  const effLocationId = locationId === "all" ? "" : String(locationId);
  const ledgerPts = customer ? getCustomerLoyaltyBalance(allRows, String(customer.id)) : 0;
  const availablePts = Math.max(Number(customer?.["points"] ?? 0), ledgerPts);
  const pointsRedeemed = Math.max(
    0,
    Math.min(
      redeem,
      availablePts,
      loyalty.rupeesPerPoint > 0
        ? Math.floor(
            Math.max(
              quote.subtotal - discount - membershipDiscount - quote.rewardDiscount - quote.couponDiscount,
              0,
            ) / loyalty.rupeesPerPoint,
          )
        : 0,
    ),
  );
  const projectedPts = Math.max(0, availablePts - pointsRedeemed + quote.pointsToEarn);
  const pointsValue = quote.loyaltyValue;
  const maxRedeem =
    loyalty.rupeesPerPoint > 0
      ? Math.min(
          availablePts,
          Math.floor(
            Math.max(
              quote.subtotal - discount - membershipDiscount - quote.rewardDiscount - quote.couponDiscount,
              0,
            ) / loyalty.rupeesPerPoint,
          ),
        )
      : 0;
  const t = {
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
  };

  function receiptText(inv: Row) {
    const lines = cart.map((l) => `• ${l.name} x${l.qty} — ${money(l.price * l.qty)}`).join("\n");
    return [
      `*${org.name}* — ${location?.name ?? scopeLabel}`,
      `Receipt ${String(inv.id)}`,
      "",
      lines,
      "",
      `Subtotal: ${money(t.subtotal)}`,
      discount ? `Discount: -${money(discount)}` : "",
      membershipDiscount ? `Membership benefit: -${money(membershipDiscount)}` : "",
      ...quote.couponLines.map((l) => `Coupon ${l.code}: -${money(l.amount)}`),
      ...quote.rewardLines.map((l) => `${l.label}: -${money(l.amount)}`),
      pointsRedeemed ? `Points redeemed: ${pointsRedeemed} pts (−${money(pointsValue)})` : "",
      `GST: ${money(t.tax)}`,
      `*Total: ${money(t.total)}*`,
      `Paid via ${payment}`,
      "",
      `Thank you, ${String(customer?.["name"] ?? "guest")}! ${org.website}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function createCustomer() {
    if (locationId === "all") return void toast.error("Select an outlet in the header before creating a customer");
    if (!isValidPhone(phone)) return void toast.error("Enter a valid 10-digit mobile number");
    const name = newCustomerName.trim();
    if (!name) return void toast.error("Enter customer name");

    const existing = findCustomerByPhoneInOrg(allRows["customers"] ?? [], phone, org.orgId, effLocationId, location?.name);
    if (existing) {
      setCustomer(existing);
      setPhone(String(existing["phone"] ?? phone));
      toast.info("Customer already exists — selected. Add the service they took.");
      return;
    }

    setCreatingCustomer(true);
    try {
      const orgRow = (allRows["organizations"] ?? []).find((o) => String(o["orgId"]) === String(org.orgId));
      const tierWeights = readRewardDistribution(orgRow).customerTier;
      const payload = rowToEntity({
        id: "0",
        orgId: org.orgId,
        locationId: effLocationId,
        name,
        phone: normalizePhone(phone),
        tier: rollCustomerTier(tierWeights),
        points: 0,
        walletBalance: 0,
        membershipId: "",
        outlet: location?.name ?? scopeLabel,
        lastVisit: "",
        totalVisits: 0,
        stampsCurrent: 0,
      });
      const saved = await customerService.save(payload);
      const row = toRow(saved as Record<string, unknown>);
      applyCache((prev) => ({ ...prev, customers: [row, ...(prev["customers"] ?? [])] }));
      setCustomer(row);
      setPhone(String(row["phone"] ?? phone));
      setNewCustomerName("");
      toast.success("Customer created", { description: `${name} · ${row.id}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create customer");
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function generateBill() {
    if (!customer) return void toast.error("Select a customer first");
    if (cart.length === 0) return void toast.error("Add at least one service or product");
    const stockErr = await stock.assertCanIssue(cart);
    if (stockErr) return void toast.error(stockErr);
    const person = staff.find((s) => String(s.id) === stylist);
    const result = await postSale({
      customer,
      lines: cart.map((l) => ({
        ...l,
        staffId: l.staffId || stylist,
        staff: String(person?.["name"] ?? l.staff),
      })),
      discount,
      pointsRedeemed,
      payment,
      rewards,
      couponCodes,
      ...(prefill ? { appointmentId: String(prefill.id) } : {}),
    });
    if (result.error || !result.invoice) return void toast.error(result.error ?? "Checkout blocked");
    const { invoice, earned, pointsAfter } = result;
    const pointsBefore = Number(customer["points"] ?? 0);
    setPointsSummary({
      before: pointsBefore,
      earned,
      redeemed: pointsRedeemed,
      after: pointsAfter,
    });
    setBill(invoice);
    setCustomer({ ...customer, points: pointsAfter });
    setWaNumber(String(customer["phone"] ?? ""));
    onBilled?.();
    toast.success("Bill generated", {
      description: `${String(invoice.id)} · ${money(t.total)} · +${earned} loyalty pts · stock, commission & history updated`,
    });
  }

  function sendWhatsApp() {
    if (!bill) return;
    send({
      to: waNumber,
      recipient: String(customer?.["name"] ?? ""),
      body: receiptText(bill),
      kind: "Receipt",
      reference: String(bill.id),
    });
    setWaOpen(false);
    toast.success(isConfigured ? "Receipt sent on WhatsApp" : "Receipt queued — configure Meta API in Settings", {
      description: waNumber,
    });
  }

  function newSale() {
    setBill(null);
    setCart([]);
    setCustomer(null);
    setPhone("");
    setNewCustomerName("");
    setPointsSummary(null);
    setDiscount(0);
    setRedeem(0);
    setRewards({});
    setCouponCodes([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Label className="mb-2 block text-xs tracking-wide uppercase">1 · Find customer by phone</Label>
          {customer ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-3">
                <UserCheck className="size-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {String(customer["name"])}{" "}
                    <span className="font-mono text-xs font-normal text-muted-foreground">{String(customer.id)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(customer["phone"])} · {String(customer["tier"] ?? "—")}
                    {membership ? ` · ${String(membershipPlan?.["name"] ?? membership["plan"])} member` : ""}
                  </p>
                  <div className="mt-2 grid gap-1 rounded-md border border-border/60 bg-background/80 p-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Previous points</span>
                      <span className="font-medium tabular-nums">{availablePts.toLocaleString("en-IN")} pts</span>
                    </div>
                    {pointsRedeemed > 0 ? (
                      <div className="flex justify-between gap-2 text-amber-700 dark:text-amber-400">
                        <span>Redeeming this bill</span>
                        <span className="font-medium tabular-nums">−{pointsRedeemed.toLocaleString("en-IN")} pts</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-2 text-primary">
                      <span>Points added this bill</span>
                      <span className="font-medium tabular-nums">+{quote.pointsToEarn.toLocaleString("en-IN")} pts</span>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-border/60 pt-1 font-medium">
                      <span>Balance after bill</span>
                      <span className="tabular-nums">{projectedPts.toLocaleString("en-IN")} pts</span>
                    </div>
                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Settings: {loyalty.pointsPerUnit} pt per ₹{loyalty.earnUnitRupees}
                      {loyalty.minSpend ? ` after ₹${loyalty.minSpend}` : ""}.
                      {cart.length === 0
                        ? " Add a service or product to calculate this bill."
                        : quote.pointsToEarn === 0
                          ? ` Eligible spend ${money(quote.taxable)} — below the earn rule, so this bill adds 0.`
                          : ` Eligible spend ${money(quote.taxable)}.`}
                    </p>
                  </div>
                  {membership && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {String(membershipPlan?.["benefits"] ?? membership["benefits"] ?? "")}
                      {visitProgress && visitProgress.limit > 0
                        ? ` · ${visitProgress.used}/${visitProgress.limit} included visits used (${visitProgress.remaining} left)`
                        : visitProgress &&
                            visitProgress.limit === 0 &&
                            (membershipPlan?.["includedMatch"] || membership["includedMatch"])
                          ? " · unlimited included visits"
                          : ""}
                    </p>
                  )}
                  {membershipBenefit.notes.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-primary">
                      {membershipBenefit.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                <X /> Change
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Search phone number e.g. 98200…"
                  className="pl-9"
                  inputMode="tel"
                />
              </div>
              {phone && (
                <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {matches.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No customer with this number yet.</p>
                  ) : (
                    matches.map((c) => (
                      <button
                        key={String(c.id)}
                        type="button"
                        onClick={() => setCustomer(c)}
                        className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-accent"
                      >
                        <span>
                          <span className="font-medium">{String(c["name"])}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{String(c.id)}</span>
                          <span className="ml-2 text-muted-foreground">{String(c["phone"])}</span>
                          <span className="ml-2 text-muted-foreground">{Number(c["points"] ?? 0)} pts</span>
                        </span>
                        <Badge variant="secondary">{String(c["tier"] ?? "—")}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
              {matches.length === 0 ? (
              <div className="mt-3 space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Create customer</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 text-xs">Mobile</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      inputMode="tel"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs">Name</Label>
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={creatingCustomer || locationId === "all"}
                  onClick={() => void createCustomer()}
                >
                  <Plus className="size-4" />
                  {creatingCustomer ? "Creating…" : "Create & select customer"}
                </Button>
                {locationId === "all" ? (
                  <p className="text-[11px] text-muted-foreground">Pick a specific outlet in the header to create a customer.</p>
                ) : null}
              </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  This number is already a customer. Select them above, then add the service they took.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Label className="mb-2 block text-xs tracking-wide uppercase">2 · Stylist</Label>
          <Select value={stylist} onValueChange={setStylist}>
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue placeholder="Select stylist for commission" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={String(s.id)} value={String(s.id)}>
                  {String(s["name"])} · {String(s["role"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(["services", "products"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder={`Search ${tab}…`}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing available for this location.</p>
            ) : (
              catalogue.map((s) => (
                <button
                  key={String(s.id)}
                  type="button"
                  onClick={() => addLine(s, tab === "services" ? "service" : "product")}
                  className="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                >
                  <p className="text-sm font-medium">
                    {String(s["name"])}
                    {tab === "services" && String(s["type"]) === "Combo" ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Combo
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tab === "services"
                      ? `${String(s["category"])} · ${Number(s["duration"] ?? 0)} min`
                      : `${String(s["brand"] ?? "")} · ${stock.remaining(String(s.id))} remaining`}
                  </p>
                  {tab === "services" &&
                    recipesForService(String(s.id), stock.services, stock.recipes).map((n) => {
                      const have = stock.remaining(n.skuId);
                      const name = String(stock.skus.find((x) => String(x.id) === n.skuId)?.["name"] ?? n.skuId);
                      const short = have < n.quantity;
                      return (
                        <p key={n.skuId} className={`mt-1 text-[11px] ${short ? "text-destructive" : "text-muted-foreground"}`}>
                          {short ? "Missing: " : "Needs: "}
                          {name} ×{n.quantity}
                          {short ? ` (have ${have})` : ""}
                        </p>
                      );
                    })}
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {tab === "products" && Number(s["sellPrice"] ?? 0) === 0
                      ? "Use on customer"
                      : money(Number(tab === "services" ? (s["price"] ?? 0) : (s["sellPrice"] ?? 0)))}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Current bill</h2>
          <Badge variant="secondary" className="font-normal">
            {location?.name ?? scopeLabel}
          </Badge>
        </div>
        {prefill && (
          <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
            <CalendarCheck className="size-4 text-primary" /> Billing appointment {String(prefill.id)}
          </p>
        )}

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No items added yet.</p>
        ) : (
          <ul className="space-y-2">
            {cart.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(l.price)} · GST {l.gstRate}% · {l.kind}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Decrease ${l.name}`}
                    onClick={() =>
                      setCart((p) =>
                        p.flatMap((x) => (x.id === l.id ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])),
                      )
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-5 text-center text-sm">{l.qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Increase ${l.name}`}
                    onClick={() =>
                      setCart((p) =>
                        p.map((x) => {
                          if (x.id !== l.id) return x;
                          if (x.kind === "product") {
                            const have = stock.remaining(x.id);
                            if (x.qty + 1 > have) {
                              toast.error(`Only ${have} units available. You cannot sell ${x.qty + 1} units.`);
                              return x;
                            }
                          }
                          return { ...x, qty: x.qty + 1 };
                        }),
                      )
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${l.name}`}
                    onClick={() => setCart((p) => p.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {missing.map((m) => (
              <p key={String(m.skuId)}>
                {m.name} is missing. Need {m.need}, have {m.have}.
              </p>
            ))}
          </div>
        )}

        <PosCouponInput
          customer={customer}
          cart={cart}
          orgId={org.orgId}
          locationId={locationId}
          payment={payment}
          staffId={stylist}
          discount={discount}
          membershipDiscount={membershipDiscount}
          allRows={allRows}
          appliedCodes={couponCodes}
          appliedLines={quote.couponLines}
          onChange={setCouponCodes}
        />

        {customer && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Scratch card and spin wheel</p>
            <p className="text-xs text-muted-foreground">
              Offers {String(customer["name"])} earned and has not used yet. Select one to apply on this bill.
            </p>
            {rewardOptions.wheelSpins.length === 0 && rewardOptions.scratchPlays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unused scratch-card or wheel offers for this customer.</p>
            ) : null}
            {rewardOptions.wheelSpins.map((spin) => (
              <label key={String(spin.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.wheelSpinId === String(spin.id)}
                  onChange={() => setRewards({ wheelSpinId: String(spin.id) })}
                />
                Wheel · {String(spin["label"])}
                {spin["rewardType"] ? ` · ${String(spin["rewardType"])}` : ""}
                {Number(spin["rewardValue"] ?? 0) > 0 ? ` ${String(spin["rewardValue"])}` : ""}
              </label>
            ))}
            {rewardOptions.scratchPlays.map((play) => (
              <label key={String(play.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.scratchPlayId === String(play.id)}
                  onChange={() => setRewards({ scratchPlayId: String(play.id) })}
                />
                Scratch · {String(play["label"])}
                {play["rewardType"] ? ` · ${String(play["rewardType"])}` : ""}
                {Number(play["rewardValue"] ?? 0) > 0 ? ` ${String(play["rewardValue"])}` : ""}
              </label>
            ))}
            {rewardOptions.offers.map((offer) => (
              <label key={String(offer.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.offerRedemptionId === String(offer.id)}
                  onChange={() => setRewards({ offerRedemptionId: String(offer.id) })}
                />
                Offer · {String(offer["offerTitle"] ?? offer.id)}
              </label>
            ))}
            {rewardOptions.partners.map((coupon) => (
              <label key={String(coupon.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.partnerCouponId === String(coupon.id)}
                  onChange={() => setRewards({ partnerCouponId: String(coupon.id) })}
                />
                Partner · {String(coupon["couponCode"])} — {String(coupon["offer"] ?? "").slice(0, 40)}
              </label>
            ))}
            {Object.keys(rewards).length > 0 ? (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setRewards({})}>
                Clear reward
              </Button>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pos-discount" className="mb-1.5">
              Discount
            </Label>
            <Input
              id="pos-discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="pos-redeem" className="mb-1.5">
              Redeem points (max {maxRedeem}
              {loyalty.rupeesPerPoint ? ` · 1 pt = ₹${loyalty.rupeesPerPoint}` : ""})
            </Label>
            <Input id="pos-redeem" type="number" value={redeem} onChange={(e) => setRedeem(Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5">Payment</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Cash", "Card", "UPI", "Wallet + Card", "Split"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{money(t.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>-{money(discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Membership benefit</dt>
            <dd>-{money(membershipDiscount)}</dd>
          </div>
          {quote.couponLines.map((line) => (
            <div key={line.code} className="flex justify-between gap-2">
              <dt className="text-muted-foreground truncate">Coupon · {line.code}</dt>
              <dd className="shrink-0">-{money(line.amount)}</dd>
            </div>
          ))}
          {quote.rewardLines.map((line) => (
            <div key={line.label} className="flex justify-between">
              <dt className="text-muted-foreground">{line.label}</dt>
              <dd>-{money(line.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Points redeemed</dt>
            <dd>−{money(pointsValue)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">GST</dt>
            <dd>{money(t.tax)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(t.total)}</dd>
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">
            {loyalty.name}: 1 pt / ₹{loyalty.earnUnitRupees}
            {loyalty.minSpend ? ` after ₹${loyalty.minSpend}` : ""} · this bill earns {quote.pointsToEarn} pts
          </p>
        </dl>

        {bill ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              Bill <span className="font-mono">{String(bill.id)}</span> generated.
            </div>
            {pointsSummary ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="mb-2 font-medium">Loyalty points</p>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Previous balance</dt>
                    <dd className="tabular-nums">{pointsSummary.before.toLocaleString("en-IN")} pts</dd>
                  </div>
                  {pointsSummary.redeemed > 0 ? (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400">
                      <dt>Redeemed</dt>
                      <dd className="tabular-nums">−{pointsSummary.redeemed.toLocaleString("en-IN")} pts</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-primary">
                    <dt>Added this bill</dt>
                    <dd className="tabular-nums">+{pointsSummary.earned.toLocaleString("en-IN")} pts</dd>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
                    <dt>New balance</dt>
                    <dd className="tabular-nums">{pointsSummary.after.toLocaleString("en-IN")} pts</dd>
                  </div>
                </dl>
              </div>
            ) : null}
            <Button className="w-full" onClick={() => setWaOpen(true)}>
              <Send /> Send on WhatsApp
            </Button>
            <Button variant="outline" className="w-full" onClick={newSale}>
              New sale
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={generateBill}>
            <Receipt /> Generate bill
          </Button>
        )}
      </aside>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send receipt on WhatsApp</DialogTitle>
            <DialogDescription>
              {isConfigured
                ? "Sent through your connected Meta WhatsApp account."
                : "Meta WhatsApp API is not configured yet — the message will be queued."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="wa-number" className="mb-1.5">
                WhatsApp number
              </Label>
              <Input id="wa-number" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
            </div>
            <pre className="max-h-60 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {bill ? receiptText(bill) : ""}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendWhatsApp}>
              <Send /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
