import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, LocateFixed, MapPin, Scissors, LogOut, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData, type Row } from "@/lib/store";
import { useTenant, type OrgLocation, type Tenant } from "@/lib/tenant";
import { isSlotFree, slotList } from "@/lib/booking";
import { distanceKm, useCustomerSession } from "@/lib/customer";

const title = "Salons near you — Book instantly";
const description = "Find salon studios near your location, compare services and stylists, and book an appointment directly.";

export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NearbyPage,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);
const DEFAULT_POS = { lat: 19.076, lng: 72.8777 }; // Mumbai

type Studio = { org: Tenant; loc: OrgLocation; km: number };

function NearbyPage() {
  const navigate = useNavigate();
  const { tenants } = useTenant();
  const { allRows, create } = useData();
  const { customer, ready, signOut } = useCustomerSession();

  const [pos, setPos] = useState(DEFAULT_POS);
  const [located, setLocated] = useState(false);
  const [picked, setPicked] = useState<Studio | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");

  useEffect(() => {
    if (ready && !customer) void navigate({ to: "/login" });
  }, [ready, customer, navigate]);

  function locateMe() {
    if (!navigator.geolocation) return void toast.error("Location is not available in this browser");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated(true);
        toast.success("Using your current location");
      },
      () => toast.error("Couldn't get your location — showing Mumbai results"),
    );
  }

  const studios = useMemo<Studio[]>(
    () =>
      tenants
        .flatMap((org) => org.locations.map((loc) => ({ org, loc, km: distanceKm(pos, loc) })))
        .filter((s) => s.loc.lat !== 0 || s.loc.lng !== 0)
        .sort((a, b) => a.km - b.km),
    [tenants, pos],
  );

  const rowsFor = (key: string, s: Studio) =>
    (allRows[key] ?? []).filter(
      (r) => String(r["orgId"]) === s.org.orgId && String(r["locationId"]) === s.loc.locationId,
    );

  const services = picked ? rowsFor("services", picked).filter((s) => String(s["active"] ?? "Yes") !== "No") : [];
  const staff = picked ? rowsFor("staff", picked).filter((s) => String(s["status"] ?? "Active") === "Active") : [];
  const service = services.find((s) => String(s.id) === serviceId) ?? null;
  const duration = Number(service?.["duration"] ?? 60);

  const appointments = useMemo(
    () => (picked ? (allRows["appointments"] ?? []).filter((a) => String(a["orgId"]) === picked.org.orgId) : []),
    [allRows, picked],
  );

  const slots = useMemo(() => {
    if (!picked || !service || !staffName) return [];
    return slotList("09:00", "20:00", 30).map((t) => ({
      time: t,
      free: isSlotFree(appointments, {
        staff: staffName,
        date,
        time: t,
        duration,
        locationId: picked.loc.locationId,
      }),
    }));
  }, [picked, service, staffName, date, duration, appointments]);

  const myBookings = (allRows["appointments"] ?? []).filter((a) => {
    if (!customer) return false;
    const digits = customer.phone.replace(/\D/g, "");
    return (
      String(a["customer"]) === customer.name ||
      (digits.length >= 10 && String(a["notes"] ?? "").replace(/\D/g, "").includes(digits))
    );
  });

  function book() {
    if (!customer || !picked || !service || !staffName || !time)
      return void toast.error("Pick a studio, service, stylist and slot");
    if (
      !isSlotFree(appointments, {
        staff: staffName,
        date,
        time,
        duration,
        locationId: picked.loc.locationId,
      })
    )
      return void toast.error("That slot was just taken — pick another time");

    const exists = (allRows["customers"] ?? []).some(
      (c) =>
        String(c["orgId"]) === picked.org.orgId &&
        String(c["phone"]).replace(/\D/g, "") === customer.phone.replace(/\D/g, ""),
    );
    if (!exists) {
      create(
        "customers",
        {
          id: `C-${Math.floor(1000 + Math.random() * 8999)}`,
          name: customer.name,
          phone: customer.phone,
          tier: "Silver",
          points: 0,
          walletBalance: 0,
          membershipId: "",
          outlet: picked.loc.name,
          lastVisit: date,
          locationId: picked.loc.locationId,
        },
        picked.org.orgId,
      );
    }
    const appt: Row = {
      id: `A-${Math.floor(5000 + Math.random() * 4999)}`,
      customer: customer.name,
      service: String(service["name"]),
      staff: staffName,
      outlet: picked.loc.name,
      date,
      time,
      duration,
      status: "Confirmed",
      source: "Customer app",
      notes: `Nearby booking · ${customer.phone}`,
      locationId: picked.loc.locationId,
    };
    create("appointments", appt, picked.org.orgId);
    setTime("");
    toast.success("Appointment confirmed", { description: `${picked.loc.name} · ${date} ${time}` });
  }

  if (!ready || !customer) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-display text-lg leading-tight font-semibold">Hi {customer.name.split(" ")[0]} 👋</p>
            <p className="text-xs text-muted-foreground">{customer.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={locateMe}>
              <LocateFixed /> {located ? "Location on" : "Use my location"}
            </Button>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold">Salons near you</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Sorted by distance from {located ? "your current location" : "Mumbai (default)"}. Pick a studio to see its
            services, stylists and open slots — bookings sync straight into that salon's POS calendar.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">Nearby studios</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {studios.map((s) => (
              <button
                key={`${s.org.orgId}-${s.loc.locationId}`}
                type="button"
                onClick={() => {
                  setPicked(s);
                  setServiceId("");
                  setStaffName("");
                  setTime("");
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  picked?.loc.locationId === s.loc.locationId ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-medium">
                    <MapPin className="size-4 text-primary" /> {s.loc.name}
                  </p>
                  <Badge variant="secondary">{s.km < 1 ? `${Math.round(s.km * 1000)} m` : `${s.km.toFixed(1)} km`}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.org.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.loc.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.loc.city} · {s.loc.phone}</p>
              </button>
            ))}
          </div>
        </section>

        {picked && (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-xl">Services at {picked.loc.name}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services published for this studio yet.</p>
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
              <h2 className="font-display text-xl">Pick stylist & slot</h2>
              <div>
                <Label className="mb-1.5">Stylist</Label>
                <Select value={staffName} onValueChange={setStaffName}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a stylist" />
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
                <Label htmlFor="nb-date" className="mb-1.5">
                  Date
                </Label>
                <Input id="nb-date" type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
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
              <Button className="w-full" onClick={book}>
                <CalendarCheck /> Book appointment
              </Button>
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl">My bookings</h2>
          {myBookings.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No appointments yet — pick a studio above.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myBookings.map((a) => (
                <div key={String(a.id)} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium">{String(a["service"])}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(a["outlet"])} · {String(a["staff"])}
                  </p>
                  <p className="mt-1 text-sm">
                    {String(a["date"])} at {String(a["time"])}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {String(a["status"])}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Salon owner?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Business login
          </Link>
        </p>
      </main>
    </div>
  );
}
