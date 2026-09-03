import { useMemo, useState } from "react";
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
import { useCollection, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { useWhatsAppSender } from "@/lib/whatsapp";
import { billTotals, usePostSale, type BillLine } from "@/lib/pos";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function PosTerminal({ prefill, onBilled }: { prefill?: Row | null; onBilled?: () => void }) {
  const { org, location, scopeLabel } = useTenant();
  const { rows: customers } = useCollection("customers");
  const { rows: services } = useCollection("services");
  const { rows: products } = useCollection("inventory");
  const { rows: staff } = useCollection("staff");
  const { rows: memberships } = useCollection("memberships");
  const postSale = usePostSale();
  const { send, isConfigured } = useWhatsAppSender();

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Row | null>(
    prefill ? (customers.find((c) => String(c["name"]) === String(prefill["customer"])) ?? null) : null,
  );
  const [stylist, setStylist] = useState(prefill ? String(prefill["staff"] ?? "") : "");
  const [serviceQuery, setServiceQuery] = useState("");
  const [tab, setTab] = useState<"services" | "products">("services");
  const [cart, setCart] = useState<BillLine[]>(() => {
    if (!prefill) return [];
    const s = services.find((x) => String(x["name"]) === String(prefill["service"]));
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
      },
    ];
  });
  const [discount, setDiscount] = useState(0);
  const [redeem, setRedeem] = useState(0);
  const [payment, setPayment] = useState("UPI");
  const [bill, setBill] = useState<Row | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  const matches = useMemo(() => {
    const q = phone.replace(/\s|\+/g, "").trim();
    if (!q) return [];
    return customers
      .filter((c) => {
        const p = String(c["phone"] ?? "").replace(/\s|\+/g, "");
        return p.includes(q) || String(c["name"] ?? "").toLowerCase().includes(phone.trim().toLowerCase());
      })
      .slice(0, 6);
  }, [customers, phone]);

  const catalogue = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (tab === "services") {
      return services
        .filter((s) => String(s["active"] ?? "Yes") !== "No")
        .filter((s) => !q || `${s["name"]} ${s["category"]}`.toLowerCase().includes(q));
    }
    return products.filter((p) => !q || `${p["name"]} ${p["brand"]}`.toLowerCase().includes(q));
  }, [services, products, serviceQuery, tab]);

  const membership = useMemo(
    () =>
      customer
        ? (memberships.find(
            (m) => String(m["customer"]) === String(customer["name"]) && String(m["status"]) === "Active",
          ) ?? null)
        : null,
    [memberships, customer],
  );

  function addLine(item: Row, kind: "service" | "product") {
    const id = String(item.id);
    if (kind === "product" && Number(item["stock"] ?? 0) <= 0) return void toast.error("Out of stock");
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
          commission: Number(item["commission"] ?? (kind === "product" ? 5 : 10)),
          staff: stylist,
        },
      ];
    });
  }

  const serviceSubtotal = cart.filter((l) => l.kind === "service").reduce((s, l) => s + l.price * l.qty, 0);
  const membershipDiscount = membership ? Math.round(serviceSubtotal * 0.15) : 0;
  const maxRedeem = Math.min(Number(customer?.["points"] ?? 0), 2000);
  const pointsRedeemed = Math.max(0, Math.min(redeem, maxRedeem));
  const t = billTotals(cart, discount, membershipDiscount, pointsRedeemed);

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
      pointsRedeemed ? `Points redeemed: -${money(pointsRedeemed)}` : "",
      `GST: ${money(t.tax)}`,
      `*Total: ${money(t.total)}*`,
      `Paid via ${payment}`,
      "",
      `Thank you, ${String(customer?.["name"] ?? "guest")}! ${org.website}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function generateBill() {
    if (!customer) return void toast.error("Select a customer first");
    if (cart.length === 0) return void toast.error("Add at least one service or product");
    const { invoice, earned } = postSale({
      customer,
      lines: cart.map((l) => ({ ...l, staff: l.kind === "service" ? stylist || l.staff : "" })),
      discount,
      membershipDiscount,
      pointsRedeemed,
      payment,
      ...(prefill ? { appointmentId: String(prefill.id) } : {}),
    });
    setBill(invoice);
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
    setDiscount(0);
    setRedeem(0);
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
                  <p className="font-medium">{String(customer["name"])}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(customer["phone"])} · {String(customer["tier"] ?? "—")} · {Number(customer["points"] ?? 0)} pts
                    {membership ? ` · ${String(membership["plan"])} member` : ""}
                  </p>
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
                    <p className="p-3 text-sm text-muted-foreground">No customer matches this number.</p>
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
                          <span className="ml-2 text-muted-foreground">{String(c["phone"])}</span>
                        </span>
                        <Badge variant="secondary">{String(c["tier"] ?? "—")}</Badge>
                      </button>
                    ))
                  )}
                </div>
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
                <SelectItem key={String(s.id)} value={String(s["name"])}>
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
                  <p className="text-sm font-medium">{String(s["name"])}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tab === "services"
                      ? `${String(s["category"])} · ${Number(s["duration"] ?? 0)} min`
                      : `${String(s["brand"] ?? "")} · stock ${Number(s["stock"] ?? 0)}`}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {money(Number(tab === "services" ? (s["price"] ?? 0) : (s["sellPrice"] ?? 0)))}
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
                    onClick={() => setCart((p) => p.map((x) => (x.id === l.id ? { ...x, qty: x.qty + 1 } : x)))}
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
              Redeem points (max {maxRedeem})
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
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Points redeemed</dt>
            <dd>-{money(pointsRedeemed)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">GST</dt>
            <dd>{money(t.tax)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(t.total)}</dd>
          </div>
        </dl>

        {bill ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              Bill <span className="font-mono">{String(bill.id)}</span> generated.
            </div>
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
