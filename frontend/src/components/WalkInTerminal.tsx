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
import { useAuth } from "@/lib/auth";
import { autoApproveCheckin, QR_CHECKINS } from "@/lib/checkins/checkin-service";
import { findCustomerByPhone } from "@/lib/customers/customer-lookup";
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
  resolveWalkInRewardMode,
  usePublicBookingSettings,
} from "@/lib/public-booking-settings";
import { readRewardDistribution, useRewardDistribution } from "@/lib/reward-distribution";
import {
  customerScratchedToday,
  getTodayScratchPlay,
  processScratchResult,
  selectScratchPrize,
} from "@/lib/scratch/scratch-service";
import { useData, type Row } from "@/lib/store";
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
  const { allRows, create, update } = useData();
  const staffSettings = usePublicBookingSettings();
  const staffRewardDist = useRewardDistribution();

  const activeOrg = useMemo(
    () => tenants.find((t) => t.orgId === bookingOrgId) ?? org,
    [tenants, bookingOrgId, org],
  );
  const activeOrgId = activeOrg.orgId;

  useEffect(() => {
    if (bookingOrgId && bookingOrgId !== org.orgId) setOrgId(bookingOrgId);
  }, [bookingOrgId, org.orgId, setOrgId]);

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === activeOrgId),
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
    initialLocationId && activeOrg.locations.some((l) => l.locationId === initialLocationId)
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
  const [wheelPrize, setWheelPrize] = useState("");
  const [scratchPrize, setScratchPrize] = useState("");
  const [rewardNotes, setRewardNotes] = useState("");

  const rewardMode = resolveWalkInRewardMode(bookingSettings);
  const staffLabel = publicMode ? "Self walk-in" : user?.name ?? "Walk-in desk";

  const customers = useMemo(
    () => (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === activeOrgId),
    [allRows, activeOrgId],
  );
  const programs = useMemo(
    () => activePrograms((allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === activeOrgId), effLocationId),
    [allRows, activeOrgId, effLocationId],
  );
  const wheelSegments = useMemo(
    () =>
      (allRows[WHEEL_SEGMENTS] ?? []).filter(
        (s) => String(s["orgId"]) === activeOrgId && String(s["programId"] ?? "LY-WHEEL") === "LY-WHEEL",
      ),
    [allRows, activeOrgId],
  );
  const scratchPrizes = useMemo(
    () =>
      (allRows[SCRATCH_PRIZES] ?? []).filter(
        (p) => String(p["orgId"]) === activeOrgId && String(p["active"] ?? "Yes") !== "No",
      ),
    [allRows, activeOrgId],
  );

  const matchedCustomer = useMemo(() => findCustomerByPhone(customers, phone), [customers, phone]);
  const phoneReady = isValidPhone(phone);

  useEffect(() => {
    if (matchedCustomer) {
      setName(String(matchedCustomer["name"] ?? ""));
      setDob(String(matchedCustomer["birthday"] ?? matchedCustomer["dob"] ?? ""));
    }
  }, [matchedCustomer]);

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
    setWheelPrize("");
    setScratchPrize("");
    setRewardNotes("");
  }

  function checkIn() {
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

    let customer = matchedCustomer;
    customer = upsertCustomerByPhone(store, {
      orgId: activeOrgId,
      name: name.trim(),
      phone,
      locationId: effLocationId,
      outlet: outletName,
      extra: { birthday: dob, dob },
    });

    setCustomerId(String(customer.id));

    if (existingToday) {
      setCheckinId(String(existingToday.id));
      setRewardNotes(String(existingToday["rewardEarned"] ?? "Already checked in today"));
      setStep(rewardMode ? "reward" : "done");
      toast.info("You are already checked in today");
      return;
    }

    const id = `CK-${Math.floor(1000 + Math.random() * 9000)}`;
    const checkinRow: Row = {
      id,
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
    create(QR_CHECKINS, checkinRow, activeOrgId);

    const result = autoApproveCheckin(store, {
      checkin: checkinRow,
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

    update(QR_CHECKINS, id, {
      ...checkinRow,
      status: "Approved",
      rewardEarned: result.notes,
    });
    setCheckinId(id);
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
          <Select value={pickedLocationId} onValueChange={setPickedLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              {activeOrg.locations.map((loc) => (
                <SelectItem key={loc.locationId} value={loc.locationId}>
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
              {rewardMode === "wheel" ? "spin the prize wheel" : "scratch the daily reward card"} once today.
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

      {step === "reward" && rewardMode === "wheel" && wheelProgram && wheelSegments.length > 0 ? (
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
                  const store = { db: allRows, create, update };
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

      {step === "reward" && rewardMode === "scratch" && scratchPrizes.length > 0 ? (
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
                  const store = { db: allRows, create, update };
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
