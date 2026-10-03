import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, Loader2, MapPin, Scissors, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store";
import { isBookableStaff, isPublishedService, isSlotFree, openingWindow, rowsAtLocation, slotsInWindow } from "@/pages/Book/booking";
import { useCustomerSession } from "@/pages/Login/customer-session";
import { upsertCustomerByPhone } from "@/pages/Customers/customer-store";
import { buildAppointmentRow } from "@/pages/Appointments/appointment-resolve";
import { findCustomerByPhone } from "@/pages/Customers/customer-lookup";
import { formatDistance, readBookingPick } from "@/pages/Nearby/nearby-utils";
import { bookingDateMax, isBookableDate, localToday, readBookingRules } from "@/pages/Book/booking-rules";
import { readServiceDisplaySettings } from "@/pages/Services/service-display-settings";
import { ServicePriceDisplay } from "@/components/ServicePriceDisplay";
import { useNearbyStudios } from "@/pages/Nearby/use-nearby-studios";
import { loadOrgCatalog, type NearbyStudio, type OrgCatalog } from "@/services/nearby.service";

export function NearbyBookingPage() {
  const { allRows, create, update } = useData();
  const { customer } = useCustomerSession();
  const { studios, loading: loadingStudios, error: loadError, refresh } = useNearbyStudios();

  const [picked, setPicked] = useState<NearbyStudio | null>(null);
  const [catalog, setCatalog] = useState<OrgCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(localToday());
  const [time, setTime] = useState("");

  const orgRow = useMemo(
    () =>
      picked
        ? (allRows["organizations"] ?? []).find((o) => String(o["orgId"]) === String(picked.org.orgId))
        : null,
    [allRows, picked],
  );
  const serviceDisplay = useMemo(
    () => (picked ? readServiceDisplaySettings(orgRow, picked.org.orgId) : readServiceDisplaySettings(null)),
    [orgRow, picked],
  );

  useEffect(() => {
    if (studios.length === 0 || picked) return;
    const saved = readBookingPick();
    if (!saved) return;
    const match = studios.find(
      (s) => s.org.orgId === saved.orgId && s.loc.locationId === saved.locationId,
    );
    if (match) void pickStudio(match);
  }, [studios, picked]);

  async function pickStudio(studio: NearbyStudio) {
    setPicked(studio);
    setServiceId("");
    setStaffName("");
    setTime("");
    setCatalog(null);
    setLoadingCatalog(true);
    try {
      setCatalog(await loadOrgCatalog(studio.org.orgId));
    } catch {
      toast.error("Could not load services for this salon");
    } finally {
      setLoadingCatalog(false);
    }
  }

  const services = picked && catalog
    ? rowsAtLocation(catalog.services, picked.org.orgId, picked.loc.locationId).filter(isPublishedService)
    : [];
  const staff = picked && catalog
    ? rowsAtLocation(catalog.staff, picked.org.orgId, picked.loc.locationId).filter(isBookableStaff)
    : [];
  const service = services.find((s) => String(s.id) === serviceId) ?? null;
  const duration = Number(service?.["duration"] ?? 60);
  const appointments = catalog?.appointments ?? [];

  const bookingRules = useMemo(() => readBookingRules(orgRow, picked?.org.orgId), [orgRow, picked]);

  const slots = useMemo(() => {
    if (!picked || !service || !staffName || !catalog) return [];
    const stylist = staff.find((s) => String(s["name"]) === staffName);
    const window = openingWindow(catalog.shifts, date, stylist?.id, bookingRules.hours);
    return slotsInWindow(window.open, window.close, duration).map((t) => ({
      time: t,
      free: isSlotFree(appointments, {
        staff: staffName,
        staffId: stylist?.id,
        date,
        time: t,
        duration,
        locationId: picked.loc.locationId,
      }),
    }));
  }, [picked, service, staffName, date, duration, appointments, staff, catalog, bookingRules]);

  async function book() {
    if (!customer || !picked || !service || !staffName || !time)
      return void toast.error("Pick a salon, service, stylist and slot");
    if (!isBookableDate(date, bookingRules.advanceDays))
      return void toast.error(
        Number(bookingRules.advanceDays) > 0
          ? `This salon only takes bookings ${bookingRules.advanceDays} days ahead`
          : "Pick today or a future date",
      );
    if (
      !isSlotFree(appointments, {
        staff: staffName,
        staffId: staff.find((s) => String(s["name"]) === staffName)?.id,
        date,
        time,
        duration,
        locationId: picked.loc.locationId,
      })
    )
      return void toast.error("That slot was just taken — pick another time");

    const orgCustomers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === String(picked.org.orgId));
    const customerRow =
      findCustomerByPhone(orgCustomers, customer.phone, picked.loc.locationId) ??
      (await upsertCustomerByPhone(
        { db: { ...allRows, customers: orgCustomers }, create, update },
        {
          orgId: picked.org.orgId,
          name: customer.name,
          phone: customer.phone,
          locationId: picked.loc.locationId,
          outlet: picked.loc.name,
          lastVisit: date,
        },
      ));
    const staffRow = staff.find((s) => String(s["name"]) === staffName) ?? null;
    const appt = buildAppointmentRow({
      customer: customerRow,
      service,
      staffName,
      staff: staffRow,
      locationId: picked.loc.locationId,
      outlet: picked.loc.name,
      date,
      time,
      duration,
      status: "Pending",
      source: "Customer app",
      notes: `Nearby booking · ${customer.phone}`,
    });
    await create("appointments", appt, picked.org.orgId);
    setTime("");
    toast.success("Appointment booked", { description: `${picked.loc.name} · ${date} ${time}` });
    setCatalog(await loadOrgCatalog(picked.org.orgId));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Choose a salon, service, stylist and time slot.</p>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="font-display text-lg font-semibold">Book appointment</h2>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loadingStudios}>
            Refresh
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="w-full shrink-0 border-b border-border lg:w-72 xl:w-80 lg:border-b-0 lg:border-r">
            <div className="max-h-[16rem] overflow-y-auto p-3 lg:max-h-none lg:min-h-[24rem]">
              {loadingStudios ? (
                <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading salons…
                </div>
              ) : loadError ? (
                <p className="px-2 py-4 text-sm text-destructive">{loadError}</p>
              ) : studios.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No salons found.</p>
              ) : (
                <ul className="space-y-2">
                  {studios.map((s) => {
                    const selected =
                      picked?.loc.locationId === s.loc.locationId && picked?.org.orgId === s.org.orgId;
                    return (
                      <li key={`${s.org.orgId}-${s.loc.locationId}`}>
                        <button
                          type="button"
                          onClick={() => void pickStudio(s)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              <MapPin className="size-4 shrink-0 text-primary" />
                              <span className="line-clamp-2">{s.loc.name}</span>
                            </p>
                            <Badge variant="secondary" className="shrink-0">
                              {formatDistance(s.km, s.approximateDistance)}
                            </Badge>
                          </div>
                          <p className="mt-1 pl-6 text-xs text-muted-foreground">{s.org.name}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 bg-muted/10 p-3 sm:p-4">
            {!picked ? (
              <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
                <CalendarCheck className="size-10 text-muted-foreground/60" />
                <p className="mt-3 font-medium">Select a salon to book</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Or browse salons on the Nearby page first, then tap Book here.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/nearby">Browse nearby</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-xl font-semibold">{picked.loc.name}</h3>
                  <p className="text-sm text-muted-foreground">{picked.org.name}</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="font-medium">Services</h4>
                  {loadingCatalog ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading…
                    </div>
                  ) : services.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No services published yet.</p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {services.map((s) => (
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
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{Number(s["duration"] ?? 0)} min ·</span>
                            <ServicePriceDisplay price={Number(s["price"] ?? 0)} settings={serviceDisplay} size="xs" />
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="font-medium">Time slot</h4>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label className="mb-1.5">Stylist</Label>
                      <Select value={staffName} onValueChange={setStaffName} disabled={loadingCatalog}>
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
                      <Label htmlFor="bk-date" className="mb-1.5">
                        Date
                      </Label>
                      <Input
                        id="bk-date"
                        type="date"
                        value={date}
                        min={localToday()}
                        max={bookingDateMax(bookingRules.advanceDays)}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 flex items-center gap-2">
                        <Clock className="size-4" /> Slots
                      </Label>
                      {slots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Pick service and stylist first.</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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
                                    : "cursor-not-allowed border-dashed text-muted-foreground line-through"
                              }`}
                            >
                              {s.time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button className="w-full" onClick={() => void book()} disabled={loadingCatalog}>
                      <CalendarCheck /> Confirm booking
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
