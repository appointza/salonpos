import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Layers, MapPin, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { KriosLogo } from "@/components/KriosLogo";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScratchCard } from "@/components/ScratchCard";
import { SpinWheel } from "@/components/SpinWheel";
import { useAuth } from "@/hooks/useAuth";
import { dbWithRow, isBookableStaff, isPublishedService, rowsAtLocation } from "@/lib/booking";
import { autoApproveCheckin, QR_CHECKINS } from "@/lib/checkins/checkin-service";
import { findCustomerByPhoneInOrg, normalizePhone } from "@/lib/customers/customer-lookup";
import { isValidPhone, upsertCustomerByPhone } from "@/lib/customers/customer-service";
import {
  activePrograms,
  isBirthdayWindow,
  programOfType,
  SCRATCH_PRIZES,
  WHEEL_SEGMENTS,
} from "@/lib/qr-loyalty";
import {
  publicBookingSettingsForOrg,
  usePublicBookingSettings,
} from "@/lib/public-booking-settings";
import { gamesForCustomer, readRewardDistribution, useRewardDistribution } from "@/lib/reward-distribution";
import {
  customerScratchedToday,
  getTodayScratchPlay,
  processScratchResult,
  selectScratchPrize,
} from "@/lib/scratch/scratch-service";
import { toRow } from "@/lib/entity-row";
import { useData, type Row } from "@/lib/store";
import { customerService } from "@/services/customer.service";
import { useTenant } from "@/lib/tenant";
import {
  customerSpunToday,
  getTodayWheelSpin,
  processWheelSpinResult,
} from "@/lib/wheel/wheel-service";

type Step = "details" | "reward" | "done";

export function WalkInTerminal({
  publicMode = false,
  bookingOrgId,
  orgSlug,
  initialLocationId,
}: {
  publicMode?: boolean;
  bookingOrgId?: string;
  orgSlug?: string;
  initialLocationId?: string;
}) {
  const { user } = useAuth();
  const { tenants, org, location, locationId, scopeLabel, setOrgId } = useTenant();
  const { allRows, create, update, applyCache } = useData();
  const staffSettings = usePublicBookingSettings();
  const staffRewardDist = useRewardDistribution();

  const activeOrg = useMemo(
    () => tenants.find((t) => String(t.orgId) === String(bookingOrgId)) ?? org,
    [tenants, bookingOrgId, org],
  );
  const activeOrgId = activeOrg.orgId;

  useEffect(() => {
    if (bookingOrgId && bookingOrgId !== org.orgId) setOrgId(bookingOrgId);
  }, [bookingOrgId, org.orgId, setOrgId]);

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(activeOrgId)),
    [allRows, activeOrgId],
  );

  const bookingSettings = useMemo(
    () => (publicMode ? publicBookingSettingsForOrg(allRows, activeOrgId) : staffSettings.settings),
    [publicMode, allRows, activeOrgId, staffSettings.settings],
  );
  const rewardDist = useMemo(
    () => (publicMode ? readRewardDistribution(orgRow) : staffRewardDist.config),
    [publicMode, orgRow, staffRewardDist.config],
  );

  const [pickedLocationId, setPickedLocationId] = useState(
    initialLocationId && activeOrg.locations.some((l) => String(l.locationId) === String(initialLocationId))
      ? initialLocationId
      : (activeOrg.locations[0]?.locationId ?? ""),
  );

  const effLocationId = publicMode
    ? pickedLocationId
    : locationId === "all"
      ? (activeOrg.locations[0]?.locationId ?? "")
      : (location?.locationId ?? locationId);
  const outletName =
    activeOrg.locations.find((l) => l.locationId === effLocationId)?.name ??
    location?.name ??
    "";

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [checkinId, setCheckinId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [checkedIn, setCheckedIn] = useState<Row | null>(null);
  const [wheelPrize, setWheelPrize] = useState("");
  const [scratchPrize, setScratchPrize] = useState("");
  const [rewardNotes, setRewardNotes] = useState("");

  const outletServices = useMemo(
    () =>
      rowsAtLocation(allRows["services"] ?? [], activeOrgId, effLocationId).filter(isPublishedService),
    [allRows, activeOrgId, effLocationId],
  );
  const outletStylists = useMemo(
    () => rowsAtLocation(allRows["staff"] ?? [], activeOrgId, effLocationId).filter(isBookableStaff),
    [allRows, activeOrgId, effLocationId],
  );
  const staffLabel = publicMode ? "Self walk-in" : user?.name ?? "Walk-in desk";

  const programs = useMemo(
    () => activePrograms((allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === String(activeOrgId)), effLocationId),
    [allRows, activeOrgId, effLocationId],
  );
  const wheelSegments = useMemo(
    () =>
      (allRows[WHEEL_SEGMENTS] ?? []).filter(
        (s) => String(s["orgId"]) === String(activeOrgId) && String(s["programId"] ?? "LY-WHEEL") === "LY-WHEEL",
      ),
    [allRows, activeOrgId],
  );
  const scratchPrizes = useMemo(
    () =>
      (allRows[SCRATCH_PRIZES] ?? []).filter(
        (p) => String(p["orgId"]) === String(activeOrgId) && String(p["active"] ?? "Yes") !== "No",
      ),
    [allRows, activeOrgId],
  );

  const matchedCustomer = useMemo(
    () => findCustomerByPhoneInOrg(allRows["customers"] ?? [], phone, activeOrgId, effLocationId),
    [allRows, phone, activeOrgId, effLocationId],
  );
  const guestTier = String((checkedIn ?? matchedCustomer)?.["tier"] ?? "");
  const tierGames = gamesForCustomer(rewardDist, guestTier);
  const showWheelGame = bookingSettings.showPrizeWheel && tierGames.wheel;
  const showScratchGame = bookingSettings.showScratchCard && tierGames.scratch;
  const rewardMode = showWheelGame || showScratchGame ? "reward" : null;
  const phoneReady = isValidPhone(phone);

  useEffect(() => {
    if (!phoneReady || !activeOrgId) return;
    let cancelled = false;
    const local = findCustomerByPhoneInOrg(allRows["customers"] ?? [], phone, activeOrgId, effLocationId, outletName);
    if (local) {
      setName(String(local["name"] ?? ""));
      setDob(String(local["birthday"] ?? local["dob"] ?? ""));
      return;
    }
    void customerService
      .select({ orgId: Number(activeOrgId) })
      .then((items) => {
        if (cancelled) return;
        const rows = items.map((item) => toRow(item as unknown as Record<string, unknown>));
        applyCache((prev) => ({ ...prev, customers: rows }));
        const found = findCustomerByPhoneInOrg(rows, phone, activeOrgId, effLocationId, outletName);
        if (!found) {
          setName("");
          setDob("");
          return;
        }
        setName(String(found["name"] ?? ""));
        setDob(String(found["birthday"] ?? found["dob"] ?? ""));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Look up once per completed number. allRows is read from this render; including it refetches forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, phoneReady, activeOrgId, effLocationId, outletName]);

  const alreadySpunToday = customerId
    ? String(getTodayWheelSpin(allRows, customerId)?.["label"] ?? "") ||
      (customerSpunToday(allRows, customerId) ? String(matchedCustomer?.["lastWheelPrize"] ?? "Used today") : "")
    : "";
  const alreadyScratchedToday = customerId
    ? String(getTodayScratchPlay(allRows, customerId)?.["label"] ?? "") ||
      (customerScratchedToday(allRows, customerId) ? String(matchedCustomer?.["lastScratchPrize"] ?? "Used today") : "")
    : "";

  function reset() {
    setPhone("");
    setName("");
    setDob("");
    setStep("details");
    setCheckinId("");
    setCustomerId("");
    setCheckedIn(null);
    setWheelPrize("");
    setScratchPrize("");
    setRewardNotes("");
  }

  async function checkIn() {
    if (!phoneReady) return void toast.error("Enter a valid 10-digit mobile number");
    if (!name.trim()) return void toast.error("Enter your name");
    if (!effLocationId) return void toast.error("Select an outlet first");

    const store = { db: allRows, create, update };
    const existingToday = matchedCustomer
      ? (allRows[QR_CHECKINS] ?? []).find(
          (c) =>
            String(c["customerId"]) === String(matchedCustomer.id) &&
            String(c["status"]) === "Approved" &&
            String(c["visitAt"] ?? "").startsWith(new Date().toISOString().slice(0, 10)),
        )
      : null;

    const known = findCustomerByPhoneInOrg(allRows["customers"] ?? [], phone, activeOrgId, effLocationId, outletName);
    let customer: Row;
    try {
      customer = await upsertCustomerByPhone(store, {
        orgId: activeOrgId,
        name: name.trim(),
        phone,
        locationId: effLocationId,
        outlet: outletName,
        ...(dob ? { extra: { birthday: dob, dob } } : {}),
      });
    } catch {
      return;
    }
    if (known) toast.success("Customer found", { description: String(customer["name"] ?? name) });
    else toast.success("Customer created", { description: `${name.trim()} · ${normalizePhone(phone)}` });

    setCustomerId(String(customer.id));
    setCheckedIn(customer);

    if (existingToday) {
      setCheckinId(String(existingToday.id));
      setRewardNotes(String(existingToday["rewardEarned"] ?? "Already checked in today"));
      setStep(rewardMode ? "reward" : "done");
      toast.info("You are already checked in today");
      return;
    }

    const checkinRow: Row = {
      id: 0,
      customerId: String(customer.id),
      customer: name.trim(),
      phone,
      staffId: publicMode ? "" : (user?.id ?? ""),
      staff: staffLabel,
      billAmount: 0,
      rewardEarned: "",
      verification: publicMode ? "Public walk-in" : "Walk-in desk",
      status: "Pending",
      visitAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      locationId: effLocationId,
      orgId: activeOrgId,
    };
    let savedCheckin: Row | void;
    try {
      savedCheckin = await create(QR_CHECKINS, checkinRow, activeOrgId);
    } catch {
      return;
    }
    if (!savedCheckin) return;

    const liveStore = { db: dbWithRow(allRows, "customers", customer), create, update };
    const result = autoApproveCheckin(liveStore, {
      checkin: savedCheckin,
      customer,
      programs,
      billAmount: 0,
      birthdayBonus: isBirthdayWindow(dob),
      locationId: effLocationId,
      orgId: activeOrgId,
      staffName: staffLabel,
    });

    if (!result.ok && !result.duplicate) {
      toast.error(result.error ?? "Could not complete check-in");
      return;
    }

    update(QR_CHECKINS, savedCheckin.id, {
      ...savedCheckin,
      status: "Approved",
      rewardEarned: result.notes,
    });
    setCheckinId(String(savedCheckin.id));
    setRewardNotes(result.notes);
    setStep(rewardMode ? "reward" : "done");
    toast.success(publicMode ? "You are checked in!" : "Walk-in checked in", { description: result.notes });
  }

  const stamp = programOfType(programs, "Stamp Card");
  const wheelProgram = programOfType(programs, "Spin the Wheel");
  const bookingLink = orgSlug ? `/${orgSlug}` : "/book";

  const content = (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!publicMode ? (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Front desk</p>
          ) : null}
          <h1 className="font-display text-2xl font-semibold">
            {publicMode ? "Welcome — walk-in check-in" : "Walk-in check-in"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeOrg.name}
            {!publicMode ? ` · ${scopeLabel}` : ""}
            {outletName ? ` · ${outletName}` : ""}
          </p>
        </div>
        {step !== "details" ? (
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-4" />
            {publicMode ? "Start over" : "New walk-in"}
          </Button>
        ) : null}
      </div>

      {publicMode && activeOrg.locations.length > 1 && step === "details" ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Label className="mb-1.5 flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Outlet
          </Label>
          <Select value={String(pickedLocationId)} onValueChange={setPickedLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              {activeOrg.locations.map((loc) => (
                <SelectItem key={String(loc.locationId)} value={String(loc.locationId)}>
                  {loc.name} · {loc.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {step === "details" ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="size-4" />
            Your details
          </div>
          <div>
            <Label className="mb-1.5">Mobile number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              autoFocus
            />
            {matchedCustomer ? (
              <p className="mt-1 text-xs text-primary">Welcome back — we found your profile</p>
            ) : null}
          </div>
          <div>
            <Label className="mb-1.5">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label className="mb-1.5">Date of birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            {isBirthdayWindow(dob) ? <Badge className="mt-2">Birthday week — bonus eligible</Badge> : null}
          </div>
          {rewardMode ? (
            <p className="text-xs text-muted-foreground">
              After check-in you can{" "}
              {showWheelGame && showScratchGame
                ? "spin the prize wheel and scratch a card"
                : showWheelGame
                  ? "spin the prize wheel"
                  : "scratch the daily reward card"}{" "}
              once today. Your tier is {guestTier || "assigned at check-in"}.
            </p>
          ) : publicMode ? (
            <p className="text-xs text-muted-foreground">Check-in only — no reward game is enabled for this salon.</p>
          ) : (
            <p className="text-xs text-amber-700">
              No walk-in reward game is enabled. Turn on prize wheel or scratch card in Settings.
            </p>
          )}
          <Button className="w-full" type="button" onClick={checkIn}>
            Check in & continue
          </Button>
          {publicMode ? (
            <p className="text-center text-xs text-muted-foreground">
              Want to book ahead?{" "}
              <Link to={bookingLink} className="text-primary underline-offset-4 hover:underline">
                Online booking
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {publicMode ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-display text-lg">Services at {outletName || activeOrg.name}</h2>
            {outletServices.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No services published for this outlet yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {outletServices.map((s) => (
                  <li key={String(s.id)} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-sm font-medium">{String(s["name"])}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(s["category"] ?? "")}
                      {s["duration"] ? ` · ${Number(s["duration"])} min` : ""}
                      {s["price"] !== undefined && s["price"] !== "" ? ` · ₹${Number(s["price"])}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-display text-lg">Stylists</h2>
            {outletStylists.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No stylists published for this outlet yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {outletStylists.map((s) => (
                  <li key={String(s.id)} className="text-sm">
                    <span className="font-medium">{String(s["name"])}</span>
                    {s["role"] ? <span className="text-muted-foreground"> · {String(s["role"])}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {(step === "reward" || step === "done") && customerId ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{phone}</p>
            </div>
            <Badge>Checked in</Badge>
          </div>
          {rewardNotes ? <p className="text-sm text-muted-foreground">{rewardNotes}</p> : null}
          {stamp ? (
            <p className="text-sm">
              Stamps{" "}
              {Number((allRows["customers"] ?? []).find((c) => String(c.id) === customerId)?.["stampsCurrent"] ?? 0)}/
              {Number(stamp["stampsRequired"] ?? 8)}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "reward" && showWheelGame && wheelProgram && wheelSegments.length > 0 ? (
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-card to-violet-500/5 p-5 shadow-sm">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" />
            Prize wheel
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">One spin per guest per day.</p>
          {alreadySpunToday || wheelPrize ? (
            <div className="mt-4 rounded-xl bg-muted/50 p-6 text-center">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today&apos;s prize</p>
              <p className="mt-2 font-display text-2xl font-semibold">{wheelPrize || alreadySpunToday}</p>
              {publicMode ? (
                <p className="mt-2 text-sm text-muted-foreground">Show this at the front desk when you pay.</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <SpinWheel
                segments={wheelSegments}
                tierWeights={rewardDist.wheel}
                onResult={(seg) => {
                  const guest =
                    checkedIn && String(checkedIn.id) === String(customerId)
                      ? checkedIn
                      : (allRows["customers"] ?? []).find((c) => String(c.id) === String(customerId));
                  const store = {
                    db: guest ? dbWithRow(allRows, "customers", guest) : allRows,
                    create,
                    update,
                  };
                  const result = processWheelSpinResult(store, {
                    customerId,
                    segment: seg,
                    locationId: effLocationId,
                    orgId: activeOrgId,
                    programId: "LY-WHEEL",
                    source: publicMode ? "public" : "qr",
                    checkinId,
                  });
                  if (result.duplicate) {
                    setWheelPrize(result.label);
                    toast.message("Wheel already used today");
                    return;
                  }
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not save spin");
                    return;
                  }
                  setWheelPrize(result.label);
                  if (checkinId) {
                    const mine = (allRows[QR_CHECKINS] ?? []).find((c) => String(c.id) === checkinId);
                    if (mine) {
                      update(QR_CHECKINS, checkinId, {
                        ...mine,
                        rewardEarned: `${mine["rewardEarned"]} · Wheel: ${result.label}`,
                      });
                    }
                  }
                  setStep("done");
                  toast.success(`You won: ${result.label}`);
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      {step === "reward" && showScratchGame && scratchPrizes.length > 0 ? (
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-card to-amber-500/5 p-5 shadow-sm">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Layers className="size-5 text-amber-500" />
            Scratch card
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">One scratch per guest per day.</p>
          {alreadyScratchedToday || scratchPrize ? (
            <div className="mt-4 space-y-3">
              <ScratchCard prizeLabel={scratchPrize || alreadyScratchedToday} brandName={activeOrg.name} completed />
              <p className="text-center text-sm">
                Prize: <strong>{scratchPrize || alreadyScratchedToday}</strong>
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <ScratchCard
                prizeLabel={scratchPrize}
                brandName={activeOrg.name}
                onBegin={() => {
                  const prize = selectScratchPrize(scratchPrizes, rewardDist.scratch);
                  if (!prize) {
                    toast.error("No scratch prizes configured");
                    return null;
                  }
                  const guest =
                    checkedIn && String(checkedIn.id) === String(customerId)
                      ? checkedIn
                      : (allRows["customers"] ?? []).find((c) => String(c.id) === String(customerId));
                  const store = {
                    db: guest ? dbWithRow(allRows, "customers", guest) : allRows,
                    create,
                    update,
                  };
                  const result = processScratchResult(store, {
                    customerId,
                    prize,
                    locationId: effLocationId,
                    orgId: activeOrgId,
                    source: publicMode ? "public" : "qr",
                    checkinId,
                  });
                  if (result.duplicate) {
                    setScratchPrize(result.label);
                    toast.message("Already scratched today");
                    return result.label;
                  }
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not save scratch card");
                    return null;
                  }
                  setScratchPrize(result.label);
                  if (checkinId) {
                    const mine = (allRows[QR_CHECKINS] ?? []).find((c) => String(c.id) === checkinId);
                    if (mine) {
                      update(QR_CHECKINS, checkinId, {
                        ...mine,
                        rewardEarned: `${mine["rewardEarned"]} · Scratch: ${result.label}`,
                      });
                    }
                  }
                  setStep("done");
                  toast.success(`Prize: ${result.label}`);
                  return result.label;
                }}
                onRevealed={(label) => setScratchPrize(label)}
              />
            </div>
          )}
        </div>
      ) : null}

      {step === "done" ? (
        <div className="flex flex-wrap gap-2">
          {!publicMode ? (
            <Button asChild variant="secondary">
              <Link to="/pos">Open POS</Link>
            </Button>
          ) : null}
          <Button type="button" variant={publicMode ? "default" : "outline"} onClick={reset}>
            {publicMode ? "Done — next guest" : "Next walk-in"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (!publicMode) {
    return content;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <KriosLogo size={40} subtitle="Walk-in · no login required" />
        <p className="text-sm font-medium text-muted-foreground">{activeOrg.name}</p>
      </div>
      {content}
    </div>
  );
}
