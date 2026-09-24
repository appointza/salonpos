import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Scissors, CalendarCheck, ExternalLink, CreditCard, Gift, TicketPercent, Layers, Sparkles } from "lucide-react";
import { BRAND_LOGO } from "@/lib/brand";
import { OfferCard } from "@/components/OfferCard";
import { ScratchCard } from "@/components/ScratchCard";
import { listOffersForPublicGuest, QR_OFFERS } from "@/lib/offers/offer-redemption-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { dbWithRow, isBookableStaff, isPublishedService, isSlotFree, openingWindow, rowsAtLocation, slotsInWindow } from "@/lib/booking";
import { validateAppointmentBooking } from "@/lib/business/appointment-service";
import { addCalendarMonths } from "@/lib/membership";
import { SpinWheel } from "@/components/SpinWheel";
import { normalizePhone, SCRATCH_PRIZES, WHEEL_SEGMENTS } from "@/lib/qr-loyalty";
import { readBookingRules } from "@/lib/booking-rules";
import { findCustomerByPhoneInOrg } from "@/lib/customers/customer-lookup";
import { upsertCustomerByPhone, isValidPhone } from "@/lib/customers/customer-service";
import { buildAppointmentRow } from "@/lib/appointments/appointment-resolve";
import { customerSpunToday, getTodayWheelSpin, processWheelSpinResult } from "@/lib/wheel/wheel-service";
import {
  customerScratchedToday,
  getTodayScratchPlay,
  processScratchResult,
  selectScratchPrize,
} from "@/lib/scratch/scratch-service";
import { publicBookingSettingsForOrg } from "@/lib/public-booking-settings";
import { gamesForCustomer, useRewardDistribution } from "@/lib/reward-distribution";
import { getCustomerLoyaltyBalance } from "@/lib/loyalty/loyalty-service";
import type { EntityId } from "@/lib/ids";
import { idStr } from "@/lib/ids";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

export function PublicBooking({
  showSwitcher = true,
  initialLocationId,
  bookingOrgId,
}: {
  showSwitcher?: boolean;
  initialLocationId?: EntityId;
  /** When set (public slug page), always scope data to this org. */
  bookingOrgId?: EntityId;
}) {
  const { tenants, org, setOrgId } = useTenant();
  const { allRows, create, update } = useData();
  const { config: rewardDist } = useRewardDistribution();

  const activeOrg = useMemo(
    () => tenants.find((t) => String(t.orgId) === String(bookingOrgId)) ?? org,
    [tenants, bookingOrgId, org],
  );
  const activeOrgId = activeOrg.orgId;

  useEffect(() => {
    if (bookingOrgId && String(bookingOrgId) !== String(org.orgId)) setOrgId(Number(bookingOrgId));
  }, [bookingOrgId, org.orgId, setOrgId]);

  const bookingFeatures = useMemo(
    () => publicBookingSettingsForOrg(allRows, activeOrgId),
    [allRows, activeOrgId],
  );
  const guestRewardBlurb = useMemo(() => {
    const parts = ["Book a service"];
    if (bookingFeatures.showScratchCard) parts.push("scratch a daily reward card");
    if (bookingFeatures.showPrizeWheel) parts.push("spin the prize wheel");
    parts.push("buy a membership");
    return parts.join(", ").replace(/, ([^,]*)$/, ", or $1") + ". All of it syncs to the salon workspace.";
  }, [bookingFeatures]);

  const [locationId, setLocationId] = useState(
    initialLocationId && activeOrg.locations.some((l) => String(l.locationId) === String(initialLocationId))
      ? initialLocationId
      : (activeOrg.locations[0]?.locationId ?? ""),
  );
  const [serviceId, setServiceId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState<Row | null>(null);
  const [planId, setPlanId] = useState("");
  const [payment, setPayment] = useState("UPI");
  const [saving, setSaving] = useState(false);
  const [purchased, setPurchased] = useState<Row | null>(null);
  const [wheelPrize, setWheelPrize] = useState("");
  const [scratchPrize, setScratchPrize] = useState("");

  const location = activeOrg.locations.find((l) => String(l.locationId) === String(locationId)) ?? activeOrg.locations[0] ?? null;

  const services = useMemo(
    () =>
      rowsAtLocation(allRows["services"] ?? [], activeOrgId, location?.locationId ?? "").filter(isPublishedService),
    [allRows, activeOrgId, location?.locationId],
  );
  const staff = useMemo(
    () => rowsAtLocation(allRows["staff"] ?? [], activeOrgId, location?.locationId ?? "").filter(isBookableStaff),
    [allRows, activeOrgId, location?.locationId],
  );
  const membershipPlans = useMemo(
    () =>
      (allRows["membershipPlans"] ?? []).filter(
        (p) => String(p["orgId"]) === String(activeOrgId) && String(p["status"] ?? "Active") === "Active",
      ),
    [allRows, activeOrgId],
  );
  const appointments = (allRows["appointments"] ?? []).filter((a) => String(a["orgId"]) === String(activeOrgId));

  const matchedCustomer = useMemo(
    () =>
      findCustomerByPhoneInOrg(
        allRows["customers"] ?? [],
        phone,
        activeOrgId,
        location?.locationId,
        location?.name,
      ),
    [allRows, activeOrgId, phone, location?.locationId, location?.name],
  );
  useEffect(() => {
    const known = String(matchedCustomer?.["name"] ?? "").trim();
    if (known) setName(known);
  }, [matchedCustomer]);
  const phoneReady = isValidPhone(phone);
  const eligibleOffers = useMemo(() => {
    if (!location || !phoneReady) return [];
    return listOffersForPublicGuest(allRows, {
      orgId: activeOrgId,
      locationId: location.locationId,
      customer: matchedCustomer,
      treatAsNewGuest: !matchedCustomer,
    });
  }, [allRows, activeOrgId, location?.locationId, phoneReady, matchedCustomer]);
  const locationOfferCount = useMemo(
    () =>
      (allRows[QR_OFFERS] ?? []).filter(
        (o) =>
          String(o["orgId"]) === String(activeOrgId) &&
          String(o["status"]) === "Active" &&
          (!o["locationId"] || String(o["locationId"]) === location?.locationId),
      ).length,
    [allRows, activeOrgId, location?.locationId],
  );
  const wheelSegments = useMemo(() => {
    const loc = location?.locationId ?? "";
    const all = (allRows[WHEEL_SEGMENTS] ?? []).filter((s) => String(s["orgId"]) === String(activeOrgId));
    const here = all.filter((s) => String(s["locationId"]) === loc);
    return here.length ? here : all;
  }, [allRows, activeOrgId, location?.locationId]);
  const scratchPrizes = useMemo(() => {
    const loc = location?.locationId ?? "";
    const all = (allRows[SCRATCH_PRIZES] ?? []).filter((s) => String(s["orgId"]) === String(activeOrgId));
    const here = all.filter((s) => String(s["locationId"]) === loc);
    return (here.length ? here : all).filter((s) => String(s["active"] ?? "Yes") !== "No");
  }, [allRows, activeOrgId, location?.locationId]);
  const alreadyScratchedToday = useMemo(() => {
    if (!matchedCustomer) return "";
    if (customerScratchedToday(allRows, String(matchedCustomer.id))) {
      const play = getTodayScratchPlay(allRows, String(matchedCustomer.id));
      return String(play?.["label"] ?? matchedCustomer["lastScratchPrize"] ?? "today");
    }
    return "";
  }, [allRows, matchedCustomer]);
  const alreadySpunToday = useMemo(() => {
    if (!matchedCustomer) return "";
    if (customerSpunToday(allRows, String(matchedCustomer.id))) {
      const spin = getTodayWheelSpin(allRows, String(matchedCustomer.id));
      return String(spin?.["label"] ?? matchedCustomer["lastWheelPrize"] ?? "today");
    }
    return "";
  }, [allRows, matchedCustomer]);
  const guestGames = gamesForCustomer(rewardDist, String(matchedCustomer?.["tier"] ?? ""));
  const showScratchGame = bookingFeatures.showScratchCard && guestGames.scratch;
  const showWheelGame = bookingFeatures.showPrizeWheel && guestGames.wheel;
  const service = services.find((s) => String(s.id) === serviceId) ?? null;
  const plan = membershipPlans.find((p) => String(p.id) === planId) ?? null;
  const duration = Number(service?.["duration"] ?? 60);
  const gstRate = 18;
  const planPrice = Number(plan?.["price"] ?? 0);
  const planTax = Math.round(planPrice * (gstRate / 100));
  const planTotal = planPrice + planTax;

  function upsertCustomer(membershipId: string, guestName = name.trim() || String(matchedCustomer?.["name"] ?? "").trim()) {
    return upsertCustomerByPhone(
      { db: allRows, create, update },
      {
        orgId: activeOrgId,
        name: guestName,
        phone,
        locationId: location?.locationId ?? "",
        outlet: location?.name ?? "",
        membershipId,
        lastVisit: today(),
      },
    );
  }

  const bookingRules = useMemo(() => {
    const orgRow = (allRows["organizations"] ?? []).find((o) => String(o["orgId"]) === String(activeOrgId));
    return readBookingRules(orgRow, activeOrgId);
  }, [allRows, activeOrgId]);
  const slots = useMemo(() => {
    if (!service || !staffName || !location || !bookingRules.onlineBooking) return [];
    const stylist = staff.find((s) => String(s["name"]) === staffName);
    const window = openingWindow(allRows["shifts"] ?? [], date, stylist?.id, bookingRules.hours);
    if (window.closed) return [];
    const step = Math.max(5, Number(bookingRules.duration) || 30);
    const noticeMs = Math.max(0, Number(bookingRules.minNotice) || 0) * 60 * 60 * 1000;
    return slotsInWindow(window.open, window.close, duration, step)
      .filter((t) => new Date(`${date}T${t}`).getTime() >= Date.now() + noticeMs)
      .map((t) => ({
      time: t,
      free: isSlotFree(appointments, {
        staff: staffName,
        staffId: stylist?.id,
        date,
        time: t,
        duration,
        locationId: location.locationId,
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, staffName, date, duration, service, location?.locationId, staff, allRows, bookingRules]);

  async function book() {
    if (saving) return;
    const guestName = name.trim() || String(matchedCustomer?.["name"] ?? "").trim();
    if (!service || !staffName || !time || !guestName || !phone || !location)
      return void toast.error("Fill every field to confirm the booking");
    const availability = validateAppointmentBooking(allRows, {
      orgId: activeOrgId,
      locationId: location.locationId,
      staffName,
      date,
      time,
      duration,
      serviceId,
    });
    if (!availability.ok) return void toast.error(availability.error);

    setSaving(true);
    setOrgId(activeOrgId);
    try {
    const customer = await upsertCustomerByPhone(
      { db: allRows, create, update },
      {
        orgId: activeOrgId,
        name: guestName,
        phone,
        locationId: location.locationId,
        outlet: location.name,
        lastVisit: date,
      },
    );
    const staffRow = staff.find((s) => String(s["name"]) === staffName) ?? null;
    const appt = buildAppointmentRow({
      customer,
      service,
      staffName,
      staff: staffRow,
      locationId: location.locationId,
      outlet: location.name,
      date,
      time,
      duration,
      status: "Confirmed",
      source: "Website",
      notes: `Online booking · ${phone}`,
    });
    await create("appointments", appt);
    setBooked(appt);
    setTime("");
    toast.success("Appointment confirmed", { description: `${date} ${time} · ${staffName}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not book that time");
    } finally {
      setSaving(false);
    }
  }

  async function ensureGuest(): Promise<Row | null> {
    if (!isValidPhone(phone)) {
      toast.error("Enter your mobile so the wheel is saved against your account");
      return null;
    }
    const guestName = name.trim() || String(matchedCustomer?.["name"] ?? "");
    if (!guestName) {
      toast.error("Enter your name to spin");
      return null;
    }
    setOrgId(activeOrgId);
    try {
      return await upsertCustomerByPhone(
        { db: allRows, create, update },
        {
          orgId: activeOrgId,
          name: guestName,
          phone,
          locationId: location?.locationId ?? "",
          outlet: location?.name ?? "",
          lastVisit: today(),
        },
      );
    } catch {
      return null;
    }
  }

  async function buyMembership() {
    if (saving) return;
    const guestName = name.trim() || String(matchedCustomer?.["name"] ?? "").trim();
    if (!plan || !guestName || !phone.trim() || !location)
      return void toast.error("Enter your name and mobile, then pick a membership");
    if (phone.replace(/\D/g, "").length < 10) return void toast.error("Enter a valid 10-digit mobile number");
    const already = (allRows["memberships"] ?? []).some(
      (m) =>
        String(m["status"] ?? "Active") === "Active" &&
        String(m["planId"] ?? m["plan"]) === String(plan.id) &&
        (String(m["customerId"]) === String(matchedCustomer?.id ?? "") ||
          String(m["customer"] ?? "").trim().toLowerCase() === guestName.toLowerCase()),
    );
    if (already) return void toast.error("This membership is already active for this customer");

    setSaving(true);
    setOrgId(activeOrgId);
    try {
    const start = today();
    const months = Math.max(1, Number(plan["validityMonths"] ?? 12));
    const memId = `MP-${Math.floor(1000 + Math.random() * 9000)}`;
    const customer = await upsertCustomer(memId, guestName);
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
    await create("memberships", enrollment);
    await create("invoices", {
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: String(customer.id),
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not take payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={BRAND_LOGO} alt="Krios" width={40} height={40} className="size-10 shrink-0 object-contain" />
            <div>
              <p className="font-display text-lg leading-tight font-semibold">{activeOrg.name}</p>
              <p className="text-xs text-muted-foreground">{activeOrg.domain} · Powered by Krios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showSwitcher && (
            <Select value={activeOrgId} onValueChange={(v) => setOrgId(v)}>
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
            {activeOrg.businessType} · {guestRewardBlurb}
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">Our locations</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeOrg.locations.map((l) => (
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
                  href={
                    l.placeId
                      ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(l.placeId)}`
                      : `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
                  }
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

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-xl">Your details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your mobile. If we already know you, your name fills in. This name and mobile are used for
            {bookingFeatures.showPrizeWheel || bookingFeatures.showScratchCard
              ? ` ${[
                  bookingFeatures.showScratchCard ? "scratch card" : "",
                  bookingFeatures.showPrizeWheel ? "prize wheel" : "",
                ]
                  .filter(Boolean)
                  .join(" and ")},`
              : ""}{" "}
            booking and membership.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="guest-phone" className="mb-1.5">
                Mobile number
              </Label>
              <Input
                id="guest-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
              />
            </div>
            <div>
              <Label htmlFor="guest-name" className="mb-1.5">
                Your name
              </Label>
              <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fills in when we know this number" />
            </div>
          </div>
          {matchedCustomer ? (
            <p className="mt-3 text-sm">
              Recognised as <strong>{String(matchedCustomer["name"])}</strong>
              {" · "}
              {String(matchedCustomer["tier"] ?? "Silver")} · {getCustomerLoyaltyBalance(allRows, String(matchedCustomer.id))} pts
            </p>
          ) : phoneReady ? (
            <p className="mt-3 text-sm text-muted-foreground">New guest — we&apos;ll show welcome offers for this outlet.</p>
          ) : null}
        </section>

        {phoneReady && location ? (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl flex items-center gap-2">
                  <TicketPercent className="size-5 text-primary" />
                  Offers for you
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  At <strong>{location.name}</strong>
                  {matchedCustomer ? ` · personalised for ${String(matchedCustomer["name"])}` : " · welcome deals for new guests"}
                </p>
              </div>
              {eligibleOffers.length > 0 ? (
                <Badge variant="secondary" className="font-normal">
                  {eligibleOffers.length} active
                </Badge>
              ) : null}
            </div>

            {eligibleOffers.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleOffers.map((offer) => (
                  <OfferCard key={String(offer.id)} offer={offer} outletName={location.name} readOnly />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                {locationOfferCount > 0
                  ? "No offers match your profile at this outlet right now. Try another location or visit during your birthday week."
                  : "No live offers at this outlet yet. Check back soon or pick another location."}
              </p>
            )}
          </section>
        ) : null}

        {showScratchGame && phoneReady && location && scratchPrizes.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-card via-card to-amber-500/5 p-5 shadow-sm">
            <h2 className="font-display text-xl flex items-center gap-2">
              <Layers className="size-5 text-amber-500" />
              Scratch & win
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One scratch card per mobile per day at <strong>{location.name}</strong>. Rub the silver foil to reveal your prize.
            </p>
            {matchedCustomer && alreadyScratchedToday ? (
              <p className="mt-3 text-sm text-muted-foreground">You already scratched today.</p>
            ) : null}
            <div className="mt-5">
              {alreadyScratchedToday || scratchPrize ? (
                <div className="space-y-4">
                  <ScratchCard
                    prizeLabel={scratchPrize || alreadyScratchedToday}
                    brandName={activeOrg.name}
                    completed
                    onBegin={() => scratchPrize || alreadyScratchedToday}
                  />
                  <p className="text-center text-sm text-muted-foreground">
                    Today&apos;s prize for {name || String(matchedCustomer?.["name"] ?? "you")}:{" "}
                    <strong>{scratchPrize || alreadyScratchedToday}</strong>
                  </p>
                </div>
              ) : (
                <ScratchCard
                  prizeLabel={scratchPrize}
                  brandName={activeOrg.name}
                  disabled={!phoneReady || (!name.trim() && !matchedCustomer) || scratchPrizes.length === 0}
                  onBegin={() => {
                    const guestPromise = ensureGuest();
                    return guestPromise.then((guest) => {
                    if (!guest || !location) return null;
                    const prize = selectScratchPrize(scratchPrizes, rewardDist.scratch);
                    if (!prize) {
                      toast.error("No scratch prizes configured");
                      return null;
                    }
                    const store = { db: dbWithRow(allRows, "customers", guest), create, update };
                    const result = processScratchResult(store, {
                      customerId: String(guest.id),
                      prize,
                      locationId: location.locationId,
                      orgId: activeOrgId,
                      source: "public",
                    });
                    if (result.duplicate) {
                      toast.message("You already scratched today", { description: result.label });
                      setScratchPrize(result.label);
                      return result.label;
                    }
                    if (!result.ok) {
                      toast.error(result.error ?? "Could not save scratch card");
                      return null;
                    }
                    setScratchPrize(result.label);
                    toast.success(`Prize saved to ${guest["name"]}`, { description: result.label });
                    return result.label;
                    });
                  }}
                  onRevealed={(label) => setScratchPrize(label)}
                />
              )}
            </div>
          </section>
        ) : null}

        {showWheelGame ? (
        <section className="overflow-hidden rounded-2xl bg-card p-5">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" />
            Prize wheel
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One spin per person per day, saved on the mobile number above.
          </p>
          {matchedCustomer && alreadySpunToday ? (
            <p className="mt-3 text-sm text-muted-foreground">Already won {alreadySpunToday} today.</p>
          ) : null}
          <div className="mt-4">
            {alreadySpunToday || wheelPrize ? (
              <div className="mx-auto max-w-md rounded-2xl bg-gradient-to-br from-amber-500/10 via-card to-violet-500/10 p-6 text-center">
                <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase">Today&apos;s prize</p>
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">{wheelPrize || alreadySpunToday}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  For {name || String(matchedCustomer?.["name"] ?? "you")} · show at checkout
                </p>
              </div>
            ) : (
              <SpinWheel
                segments={wheelSegments}
                tierWeights={rewardDist.wheel}
                disabled={normalizePhone(phone).length < 10 || (!name.trim() && !matchedCustomer)}
                onResult={(seg) => {
                  void (async () => {
                    const guest = await ensureGuest();
                    if (!guest || !location) return;
                    const store = { db: dbWithRow(allRows, "customers", guest), create, update };
                    const result = processWheelSpinResult(store, {
                      customerId: String(guest.id),
                      segment: seg,
                      locationId: location.locationId,
                      orgId: activeOrgId,
                      source: "public",
                    });
                    if (result.duplicate) {
                      toast.message("You already spun today", { description: result.label });
                      setWheelPrize(result.label);
                      return;
                    }
                    if (!result.ok) {
                      toast.error(result.error ?? "Could not save spin");
                      return;
                    }
                    setWheelPrize(result.label);
                    toast.success(`Prize saved to ${guest["name"]}`, { description: result.label });
                  })();
                }}
              />
            )}
          </div>
        </section>
        ) : null}

        {membershipPlans.length > 0 && (
          <section>
            <h2 className="font-display text-xl">Buy a membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a plan and pay. It is linked to the name and mobile you entered above.
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
              <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2">
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
                  <Button className="w-full" disabled={saving} onClick={() => void buyMembership()}>
                    <CreditCard /> {saving ? "Paying…" : `Pay ${money(planTotal)}`}
                  </Button>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">
                    {money(planPrice)} + {gstRate}% GST · {name || "Name"} · {phone || "mobile"}
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
              <Input
                id="bk-date"
                type="date"
                value={date}
                min={today()}
                max={new Date(Date.now() + Math.max(1, Number(bookingRules.advanceDays) || 30) * 86400000).toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
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
            <p className="text-xs text-muted-foreground">
              Booking as {name.trim() || "—"} · {phone.trim() || "add mobile above"}
            </p>
            <Button className="w-full" disabled={saving || !time} onClick={() => void book()}>
              <CalendarCheck /> {saving ? "Booking…" : "Confirm booking"}
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
