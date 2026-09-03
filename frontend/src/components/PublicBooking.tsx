import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Scissors, CalendarCheck, ExternalLink, CreditCard, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { isSlotFree, slotList } from "@/lib/booking";
import { addCalendarMonths } from "@/lib/membership";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

export function PublicBooking({ showSwitcher = true }: { showSwitcher?: boolean }) {
  const { tenants, org, setOrgId } = useTenant();
  const { allRows, create, update } = useData();

  const [locationId, setLocationId] = useState(org.locations[0]?.locationId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState<Row | null>(null);
  const [planId, setPlanId] = useState("");
  const [payment, setPayment] = useState("UPI");
  const [purchased, setPurchased] = useState<Row | null>(null);

  const location = org.locations.find((l) => l.locationId === locationId) ?? org.locations[0] ?? null;

  const scoped = (key: string) =>
    (allRows[key] ?? []).filter(
      (r) => String(r["orgId"]) === org.orgId && (!location || String(r["locationId"]) === location.locationId),
    );

  const services = useMemo(
    () => scoped("services").filter((s) => String(s["active"] ?? "Yes") !== "No"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, org.orgId, location?.locationId],
  );
  const staff = useMemo(
    () => scoped("staff").filter((s) => String(s["status"] ?? "Active") === "Active"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, org.orgId, location?.locationId],
  );
  const membershipPlans = useMemo(
    () =>
      (allRows["membershipPlans"] ?? []).filter(
        (p) => String(p["orgId"]) === org.orgId && String(p["status"] ?? "Active") === "Active",
      ),
    [allRows, org.orgId],
  );
  const appointments = (allRows["appointments"] ?? []).filter((a) => String(a["orgId"]) === org.orgId);

  const service = services.find((s) => String(s.id) === serviceId) ?? null;
  const plan = membershipPlans.find((p) => String(p.id) === planId) ?? null;
  const duration = Number(service?.["duration"] ?? 60);
  const gstRate = 18;
  const planPrice = Number(plan?.["price"] ?? 0);
  const planTax = Math.round(planPrice * (gstRate / 100));
  const planTotal = planPrice + planTax;

  function findCustomer() {
    const digits = phone.replace(/\D/g, "");
    return (
      (allRows["customers"] ?? []).find(
        (c) => String(c["orgId"]) === org.orgId && String(c["phone"]).replace(/\D/g, "") === digits,
      ) ?? null
    );
  }

  function upsertCustomer(membershipId: string): Row {
    const existing = findCustomer();
    if (existing) {
      const next = { ...existing, name: name || String(existing["name"]), membershipId, lastVisit: today() };
      update("customers", String(existing.id), next);
      return next;
    }
    const row: Row = {
      id: `C-${Math.floor(1000 + Math.random() * 8999)}`,
      name,
      phone,
      tier: "Silver",
      points: 0,
      walletBalance: 0,
      membershipId,
      outlet: location?.name ?? "",
      lastVisit: today(),
      locationId: location?.locationId ?? "",
    };
    create("customers", row);
    return row;
  }

  const slots = useMemo(() => {
    if (!service || !staffName || !location) return [];
    return slotList("09:00", "20:00", 30).map((t) => ({
      time: t,
      free: isSlotFree(appointments, {
        staff: staffName,
        date,
        time: t,
        duration,
        locationId: location.locationId,
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, staffName, date, duration, service, location?.locationId]);

  function book() {
    if (!service || !staffName || !time || !name || !phone || !location)
      return void toast.error("Fill every field to confirm the booking");
    if (!isSlotFree(appointments, { staff: staffName, date, time, duration, locationId: location.locationId }))
      return void toast.error("That slot was just taken — pick another time");

    setOrgId(org.orgId);
    const existing = findCustomer();
    if (!existing) {
      create("customers", {
        id: `C-${Math.floor(1000 + Math.random() * 8999)}`,
        name,
        phone,
        tier: "Silver",
        points: 0,
        walletBalance: 0,
        membershipId: "",
        outlet: location.name,
        lastVisit: date,
        locationId: location.locationId,
      });
    }
    const appt: Row = {
      id: `A-${Math.floor(5000 + Math.random() * 4999)}`,
      customer: name,
      service: String(service["name"]),
      staff: staffName,
      outlet: location.name,
      date,
      time,
      duration,
      status: "Confirmed",
      source: "Website",
      notes: `Online booking · ${phone}`,
      locationId: location.locationId,
    };
    create("appointments", appt);
    setBooked(appt);
    toast.success("Appointment confirmed", { description: `${date} ${time} · ${staffName}` });
  }

  function buyMembership() {
    if (!plan || !name.trim() || !phone.trim() || !location)
      return void toast.error("Enter your name and mobile, then pick a membership");
    if (phone.replace(/\D/g, "").length < 10) return void toast.error("Enter a valid 10-digit mobile number");

    setOrgId(org.orgId);
    const start = today();
    const months = Math.max(1, Number(plan["validityMonths"] ?? 12));
    const memId = `MP-${Math.floor(1000 + Math.random() * 9000)}`;
    const customer = upsertCustomer(memId);
    const enrollment: Row = {
      id: memId,
      planId: String(plan.id),
      plan: String(plan["name"]),
      customerId: String(customer.id),
      startDate: start,
      endDate: addCalendarMonths(start, months),
      used: 0,
      status: "Active",
      locationId: location.locationId,
    };
    create("memberships", enrollment);
    create("invoices", {
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: String(customer["name"]),
      customerPhone: String(customer["phone"] ?? phone),
      outlet: location.name,
      date: start,
      items: `Membership · ${String(plan["name"])}`,
      subtotal: planPrice,
      discount: 0,
      gstRate,
      tax: planTax,
      total: planTotal,
      payment,
      status: "Paid",
      locationId: location.locationId,
    });
    setPurchased(enrollment);
    toast.success("Membership purchased", {
      description: `${String(plan["name"])} · ${money(planTotal)} · ${payment}`,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: org.brandColor }}
            >
              {org.name.slice(0, 1)}
            </span>
            <div>
              <p className="font-display text-lg leading-tight font-semibold">{org.name}</p>
              <p className="text-xs text-muted-foreground">{org.domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showSwitcher && (
            <Select value={org.orgId} onValueChange={(v) => setOrgId(v)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.orgId} value={t.orgId}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
            <Button variant="outline" asChild>
              <Link to="/login">Salon login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold">Book your next appointment</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {org.businessType} · Book a service, or buy a membership online. Both sync into the salon workspace.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">Our locations</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {org.locations.map((l) => (
              <button
                key={l.locationId}
                type="button"
                onClick={() => {
                  setLocationId(l.locationId);
                  setServiceId("");
                  setStaffName("");
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  l.locationId === location?.locationId ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <p className="flex items-center gap-2 font-medium">
                  <MapPin className="size-4 text-primary" /> {l.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{l.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.phone} · {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                </p>
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on map <ExternalLink className="size-3" />
                </a>
              </button>
            ))}
          </div>
        </section>

        {membershipPlans.length > 0 && (
          <section>
            <h2 className="font-display text-xl">Buy a membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a plan, enter your name and mobile, and pay online. Your membership is linked to this number at checkout.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {membershipPlans.map((m) => (
                <button
                  key={String(m.id)}
                  type="button"
                  onClick={() => setPlanId(String(m.id))}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    String(m.id) === planId ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <p className="flex items-center gap-2 font-medium">
                    <Gift className="size-4 text-primary" /> {String(m["name"])}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{String(m["benefits"])}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {Number(m["validityMonths"] ?? 0)} months
                    {Number(m["includedLimit"] ?? 0) <= 0
                      ? " · Unlimited included visits"
                      : ` · ${Number(m["includedLimit"])} included visits`}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{money(Number(m["price"] ?? 0))}</p>
                </button>
              ))}
            </div>
            {plan && (
              <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="mem-name" className="mb-1.5">
                    Your name
                  </Label>
                  <Input id="mem-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="mem-phone" className="mb-1.5">
                    Mobile number
                  </Label>
                  <Input id="mem-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5">Payment</Label>
                  <Select value={payment} onValueChange={setPayment}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Cash">Pay at salon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end">
                  <Button className="w-full" onClick={buyMembership}>
                    <CreditCard /> Pay {money(planTotal)}
                  </Button>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">
                    {money(planPrice)} + {gstRate}% GST
                  </p>
                </div>
              </div>
            )}
            {purchased && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                Membership <span className="font-medium">{String(purchased["plan"])}</span> is active until{" "}
                {String(purchased["endDate"])}. Ref <span className="font-mono">{String(purchased.id)}</span>.
                <Badge variant="secondary" className="ml-2">
                  Linked to your number
                </Badge>
              </div>
            )}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-xl">Services at {location?.name ?? "—"}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services published for this location yet.</p>
              ) : (
                services.map((s) => (
                  <button
                    key={String(s.id)}
                    type="button"
                    onClick={() => setServiceId(String(s.id))}
                    className={`rounded-lg border p-3 text-left ${
                      String(s.id) === serviceId ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Scissors className="size-4 text-primary" /> {String(s["name"])}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(s["category"])} · {Number(s["duration"] ?? 0)} min
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">{money(Number(s["price"] ?? 0))}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-xl">Choose date & time</h2>
            <div>
              <Label className="mb-1.5">Stylist</Label>
              <Select value={staffName} onValueChange={setStaffName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any available stylist" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s["name"])}>
                      {String(s["name"])} · {String(s["role"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bk-date" className="mb-1.5">
                Date
              </Label>
              <Input id="bk-date" type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-2">
                <Clock className="size-4" /> Available slots
              </Label>
              {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">Pick a service and stylist to see open slots.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.free}
                      onClick={() => setTime(s.time)}
                      className={`rounded-md border px-2 py-1.5 text-xs ${
                        time === s.time
                          ? "border-primary bg-primary text-primary-foreground"
                          : s.free
                            ? "border-border hover:border-primary"
                            : "cursor-not-allowed border-dashed border-border text-muted-foreground line-through"
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="bk-name" className="mb-1.5">
                  Your name
                </Label>
                <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bk-phone" className="mb-1.5">
                  Mobile number
                </Label>
                <Input id="bk-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={book}>
              <CalendarCheck /> Confirm booking
            </Button>
            {booked && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                Booked <span className="font-mono">{String(booked.id)}</span> — {String(booked["service"])} with{" "}
                {String(booked["staff"])} on {String(booked["date"])} at {String(booked["time"])}.
                <Badge variant="secondary" className="ml-2">
                  Synced to POS
                </Badge>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
