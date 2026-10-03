import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, UserCheck, Plus, Minus, Trash2, Receipt, Send, X, CalendarCheck, CreditCard } from "lucide-react";
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
import { useCollection, useData, type Row } from "@/store";
import { useTenant } from "@/tenant";
import { findCustomerByPhoneInOrg, normalizePhone } from "@/pages/Customers/customer-lookup";
import { isValidPhone } from "@/pages/Customers/customer-store";
import { rowToEntity, toRow } from "@/entity-row";
import type { CustomerPosLookupRes, CustomerRes } from "@/model/customers";
import { customerService, mergePosLookup } from "@/services/customer.service";
import { getCustomerLoyaltyBalance } from "@/pages/Loyalty/loyalty-service";
import { useWhatsAppSender } from "@/pages/Campaigns/whatsapp";
import { usePostSale, useSaleQuote, type BillLine } from "@/pages/Pos/sale";
import type { RewardRefs } from "@/pages/Loyalty/rewards/reward-quote";
import { getCustomerRewardOptions, rewardCustomerIds } from "@/pages/Loyalty/rewards/reward-quote";
import { resolveCustomerRow, resolveServiceRow } from "@/pages/Appointments/appointment-resolve";
import { includedVisitProgress } from "@/pages/Memberships/membership";
import { useStockService } from "@/pages/Inventory/stock";
import { recipesForService } from "@/pages/Services/service-recipe";
import { staffIdFromName } from "@/pages/Attendance/hr";
import { PosCouponInput } from "@/components/PosCouponInput";
import { hydrateScratchPrize, hydrateWheelPrize, resolvePrizeService, type PrizeClaim } from "@/pages/PrizeWheel/prize-discount";
import { formatPrizeValue, prizeTypeLabel } from "@/pages/PrizeWheel/prize-help";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function phoneFromAppointment(prefill: Row | null, customers: Row[]) {
  if (!prefill) return "";
  const fromCustomer = resolveCustomerRow(prefill, customers);
  const fromRow = normalizePhone(String(fromCustomer?.["phone"] ?? ""));
  if (fromRow.length >= 10) return fromRow;
  const notes = `${prefill["notes"] ?? ""} ${prefill["customer"] ?? ""}`;
  const digits = notes.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 ? last10 : "";
}

export function PosTerminal({ prefill, onBilled }: { prefill?: Row | null; onBilled?: () => void }) {
  const { org, location, locationId, scopeLabel } = useTenant();
  const { allRows, applyCache } = useData();
  const { rows: customers } = useCollection("customers", { autoload: false });
  const { rows: services } = useCollection("services");
  const { rows: products } = useCollection("inventory");
  const { rows: staff } = useCollection("staff", { autoload: false });
  useCollection("wheelSegments");
  useCollection("scratchPrizes");
  const postSale = usePostSale();
  const stock = useStockService();
  const { send, isConfigured } = useWhatsAppSender();

  const [phone, setPhone] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "missing">("idle");
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
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  function applyLookup(res: CustomerPosLookupRes) {
    if (res.errorMessage || !res.customer) return false;
    applyCache((prev) => mergePosLookup(prev, res));
    setCustomer(toRow(res.customer as unknown as Record<string, unknown>));
    setPhone(String(res.customer.phone ?? ""));
    setLookupStatus("found");
    return true;
  }

  useEffect(() => {
    if (!prefill) return;
    const oid = Number(org.orgId);
    if (!oid) return;
    const customerId = Number(prefill["customerId"] ?? 0);
    const cached = resolveCustomerRow(prefill, orgCustomers.length ? orgCustomers : customers);
    const phoneHint = phoneFromAppointment(prefill, orgCustomers.length ? orgCustomers : customers);
    if (cached && !customerId && phoneHint.length < 10) {
      setCustomer(cached);
      setPhone(String(cached["phone"] ?? ""));
    }
    if (customerId <= 0 && phoneHint.length < 10) return;
    let cancelled = false;
    setLookupStatus("loading");
    void customerService
      .lookupAtPos({
        orgId: oid,
        locationId: locationId === "all" ? Number(prefill["locationId"] ?? 0) || 0 : Number(locationId) || 0,
        customerId: customerId > 0 ? customerId : 0,
        phone: phoneHint,
      })
      .then((res) => {
        if (cancelled) return;
        if (!applyLookup(res)) {
          if (cached) {
            setCustomer(cached);
            setPhone(String(cached["phone"] ?? phoneHint));
            setLookupStatus("found");
            return;
          }
          setLookupStatus("missing");
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (cached) {
          setCustomer(cached);
          setPhone(String(cached["phone"] ?? phoneHint));
          setLookupStatus("found");
        } else setLookupStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [prefill, org.orgId, locationId]);

  useEffect(() => {
    if (!prefill || cart.length > 0) return;
    const s = resolveServiceRow(prefill, services);
    if (!s) return;
    setCart([
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
    ]);
  }, [prefill, services, staff, cart.length]);

  useEffect(() => {
    if (prefill) return;
    if (customer) return;
    const digits = normalizePhone(phone);
    if (!isValidPhone(phone)) {
      setLookupStatus("idle");
      return;
    }
    const oid = Number(org.orgId);
    if (!oid) return;
    let cancelled = false;
    setLookupStatus("loading");
    void customerService
      .lookupAtPos({
        orgId: oid,
        locationId: locationId === "all" ? 0 : Number(locationId) || 0,
        phone: digits,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.errorMessage || !res.customer) {
          setLookupStatus("missing");
          return;
        }
        applyCache((prev) => mergePosLookup(prev, res));
        setCustomer(toRow(res.customer as unknown as Record<string, unknown>));
        setPhone(String(res.customer.phone ?? digits));
        setLookupStatus("found");
      })
      .catch(() => {
        if (!cancelled) setLookupStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [phone, customer, org.orgId, locationId, applyCache]);

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
  const selectedPrize =
    (rewards.wheelSpinId
      ? rewardOptions.wheelSpins.find((s) => String(s.id) === rewards.wheelSpinId)
      : undefined) ??
    (rewards.scratchPlayId
      ? rewardOptions.scratchPlays.find((s) => String(s.id) === rewards.scratchPlayId)
      : undefined);
  const selectedClaim: PrizeClaim | null = selectedPrize
    ? rewards.wheelSpinId
      ? hydrateWheelPrize(allRows, selectedPrize)
      : hydrateScratchPrize(allRows, selectedPrize)
    : null;
  const selectedFreeService =
    selectedClaim?.prizeType === "Free service" || selectedClaim?.prizeType === "Free item";
  const membership = quote.membership;
  const membershipPlan = quote.plan;
  const membershipBenefit = quote.benefit;
  const membershipDiscount = quote.membershipDiscount;
  const loyalty = quote.rule;
  const visitProgress = membership
    ? includedVisitProgress(membership, allRows["membershipPlans"] ?? [], allRows["membershipUsage"] ?? [])
    : null;

  function addLine(item: Row, kind: "service" | "product") {
    const id = String(item.id);
    if (kind === "product" && stock.remaining(id) <= 0) return void toast.error("Out of stock");
    const inCart = cart.find((l) => l.id === id)?.qty ?? 0;
    if (kind === "product" && inCart + 1 > stock.remaining(id)) {
      const have = stock.remaining(id);
      return void toast.error(`Only ${have} units available. You cannot sell ${inCart + 1} units.`);
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

  function claimPrizeOnBill(prize: PrizeClaim) {
    if (prize.prizeType === "No prize") {
      toast.message("This slice is not a gift");
      return;
    }
    if (prize.prizeType === "Bonus points") {
      toast.message("Bonus points were already added when they spun. Nothing to take off this bill.");
      return;
    }
    if (prize.prizeType === "Partner offer") {
      toast.message(`Partner gift: ${prize.label}. This does not change the salon bill.`);
      return;
    }
    if (prize.prizeType !== "Free service" && prize.prizeType !== "Free item") return;
    const service = resolvePrizeService(prize, services);
    if (!service) {
      toast.message("This prize has no service id. Open Prize wheel, pick the service, and save again.");
      return;
    }
    if (cart.some((l) => l.id === String(service.id))) return;
    addLine(service, "service");
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
      const payload = rowToEntity({
        id: "0",
        orgId: org.orgId,
        locationId: effLocationId,
        name,
        phone: normalizePhone(phone),
        tier: "Bronze",
        points: 0,
        walletBalance: 0,
        membershipId: "",
        outlet: location?.name ?? scopeLabel,
        lastVisit: "",
        totalVisits: 0,
        stampsCurrent: 0,
      });
      const saved = await customerService.save(payload as CustomerRes);
      const row = toRow(saved as unknown as Record<string, unknown>);
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
    if (postingRef.current) return;
    if (!customer) return void toast.error("Select a customer first");
    if (cart.length === 0) return void toast.error("Add at least one service or product");
    postingRef.current = true;
    setPosting(true);
    const person = staff.find((s) => String(s.id) === stylist);
    try {
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
      const { invoice, earned } = result;
      onBilled?.();
      newSale();
      toast.success("Bill generated", {
        description: `${String(invoice.id)} · ${money(t.total)} · +${earned} loyalty pts. Screen cleared for the next bill.`,
      });
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
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
    setLookupStatus("idle");
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
          {prefill && lookupStatus === "loading" && !customer ? (
            <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              Loading customer, membership and offers for this appointment…
            </p>
          ) : customer ? (
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLookupStatus("idle");
                  setCustomer(null);
                }}
              >
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
                  placeholder="10-digit mobile number"
                  className="pl-9"
                  inputMode="tel"
                />
              </div>
              {phone && (
                <div className="mt-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                  {lookupStatus === "loading"
                    ? "Looking up customer, coupons, membership and rewards…"
                    : lookupStatus === "idle"
                      ? "Enter the full 10-digit mobile number to load this customer."
                      : "No customer with this number yet."}
                </div>
              )}
              {lookupStatus === "missing" ? (
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
              ) : null}
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

        {customer ? (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <CreditCard className="size-3.5" />
              Membership — how to claim
            </p>
            {membership ? (
              <>
                <p className="text-sm font-medium">
                  {String(membershipPlan?.["name"] ?? membership["plan"] ?? "Active plan")}
                  {visitProgress && visitProgress.limit > 0
                    ? ` · ${visitProgress.remaining} of ${visitProgress.limit} included visits left`
                    : visitProgress && visitProgress.limit === 0
                      ? " · unlimited included visits"
                      : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Membership applies automatically — add matching services or products, then complete the sale. No
                  separate claim button.
                </p>
                {membershipPlan?.["includedMatch"] ? (
                  <p className="text-xs text-muted-foreground">
                    Included services match: <span className="font-medium">{String(membershipPlan["includedMatch"])}</span>
                  </p>
                ) : null}
                {membershipBenefit.notes.length > 0 ? (
                  <ul className="space-y-0.5 text-sm text-primary">
                    {membershipBenefit.notes.map((n, i) => (
                      <li key={i}>Claiming now: {n}</li>
                    ))}
                  </ul>
                ) : cart.length > 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Nothing on this bill matches the plan yet. Check service names against the plan keywords on
                    Memberships.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Add bill items — the member discount shows under Membership benefit.</p>
                )}
                {membershipDiscount > 0 ? (
                  <p className="text-sm font-semibold text-primary">This bill: −{money(membershipDiscount)} membership discount</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This customer has no active membership. Enroll them on{" "}
                <Link to="/memberships" className="text-primary underline-offset-4 hover:underline">
                  Memberships
                </Link>
                , then select them here again.
              </p>
            )}
          </div>
        ) : null}

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
              Same gifts as Prize wheel. Select one to claim it on this bill — percent off, rupees off, or the free
              treatment added and taken off the total.
            </p>
            {rewardOptions.wheelSpins.length === 0 && rewardOptions.scratchPlays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unused scratch-card or wheel offers for this customer.</p>
            ) : null}
            {rewardOptions.wheelSpins.map((spin) => {
              const prize = hydrateWheelPrize(allRows, spin);
              return (
              <label key={String(spin.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.wheelSpinId === String(spin.id)}
                  onChange={() => {
                    setRewards({ wheelSpinId: String(spin.id) });
                    claimPrizeOnBill(prize);
                  }}
                />
                Wheel · {prize.label || String(spin["label"])}
                {prize.prizeType ? ` · ${prizeTypeLabel(prize.prizeType)}` : ""}
                {prize.prizeType ? ` · ${formatPrizeValue(prize.prizeType, prize.prizeValue)}` : ""}
              </label>
              );
            })}
            {rewardOptions.scratchPlays.map((play) => {
              const prize = hydrateScratchPrize(allRows, play);
              return (
              <label key={String(play.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pos-reward"
                  checked={rewards.scratchPlayId === String(play.id)}
                  onChange={() => {
                    setRewards({ scratchPlayId: String(play.id) });
                    claimPrizeOnBill(prize);
                  }}
                />
                Scratch · {prize.label || String(play["label"])}
                {prize.prizeType ? ` · ${prizeTypeLabel(prize.prizeType)}` : ""}
                {prize.prizeType ? ` · ${formatPrizeValue(prize.prizeType, prize.prizeValue)}` : ""}
              </label>
              );
            })}
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
            {selectedFreeService && quote.rewardDiscount <= 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This prize is claimed by service id. Add that same service to the bill, or re-save the Prize wheel slice
                with a service picked.
              </p>
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
          <Button className="w-full" type="button" disabled={posting} onClick={() => void generateBill()}>
            <Receipt /> {posting ? "Saving bill…" : "Generate bill"}
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
