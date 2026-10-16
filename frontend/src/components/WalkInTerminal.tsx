import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Layers, MapPin, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { salonLogoUrl } from "@/brand";
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
import { dbWithRow } from "@/pages/Book/booking";
import { autoApproveCheckin, QR_CHECKINS } from "@/pages/LoyaltyCheckins/checkin-service";
import { findCustomerByPhoneInOrg, normalizePhone } from "@/pages/Customers/customer-lookup";
import { isValidPhone, upsertCustomerByPhone } from "@/pages/Customers/customer-store";
import { toRow } from "@/entity-row";
import { ReferralShareCard } from "@/components/ReferralShareCard";
import { ensureCustomerReferralCode, validateWalkInCode, type WalkInCodeResult } from "@/pages/Loyalty/referral-service";
import {
  activePrograms,
  isBirthdayWindow,
  programOfType,
  referralCodeFor,
  SCRATCH_PRIZES,
  WHEEL_SEGMENTS,
} from "@/pages/LoyaltyQr/qr-loyalty";
import {
  guestRewardGames,
  publicBookingSettingsForOrg,
  usePublicBookingSettings,
} from "@/pages/Book/public-booking-settings";
import { offerAvailWithinMessage, readRewardDistribution, useRewardDistribution } from "@/pages/PrizeWheel/reward-distribution";
import {
  customerScratchedToday,
  getTodayScratchPlay,
  processScratchResult,
  selectScratchPrize,
} from "@/pages/ScratchCard/scratch-service";
import { uniquePrizeCatalog } from "@/pages/PrizeWheel/prize-help";
import { useData, type Row } from "@/store";
import { customerService } from "@/services/customer.service";
import { organizationService } from "@/services/organization.service";
import { scratchPrizeService } from "@/services/scratchPrize.service";
import { wheelSegmentService } from "@/services/wheelSegment.service";
import { useTenant } from "@/tenant";
import {
  customerSpunToday,
  getTodayWheelSpin,
  processWheelSpinResult,
} from "@/pages/PrizeWheel/wheel-service";

type Step = "details" | "reward" | "done";

export function WalkInTerminal({
  publicMode = false,
  bookingOrgId,
  initialLocationId,
  initialReferralCode,
}: {
  publicMode?: boolean;
  bookingOrgId?: string | number;
  orgSlug?: string;
  initialLocationId?: string;
  initialReferralCode?: string;
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
    if (bookingOrgId && Number(bookingOrgId) !== Number(org.orgId)) setOrgId(Number(bookingOrgId));
  }, [bookingOrgId, org.orgId, setOrgId]);

  useEffect(() => {
    const oid = Number(activeOrgId);
    if (!oid) return;
    let cancelled = false;
    const orgReq = { orgId: oid };
    const load = publicMode
      ? Promise.all([
          wheelSegmentService.selectPublic(orgReq),
          scratchPrizeService.selectPublic(orgReq),
          organizationService.selectPublic(orgReq),
        ])
      : Promise.all([
          wheelSegmentService.select(orgReq),
          scratchPrizeService.select(orgReq),
          organizationService.select(orgReq),
        ]);
    void load
      .then(([wheels, scratches, orgs]) => {
        if (cancelled) return;
        applyCache((prev) => ({
          ...prev,
          wheelSegments: [
            ...(prev["wheelSegments"] ?? []).filter((r) => String(r["orgId"]) !== String(oid)),
            ...wheels.map((item) => toRow(item as unknown as Record<string, unknown>)),
          ],
          scratchPrizes: [
            ...(prev["scratchPrizes"] ?? []).filter((r) => String(r["orgId"]) !== String(oid)),
            ...scratches.map((item) => toRow(item as unknown as Record<string, unknown>)),
          ],
          organizations: orgs.length
            ? [
                ...(prev["organizations"] ?? []).filter((r) => String(r["orgId"]) !== String(oid)),
                ...orgs.map((item) => toRow(item as unknown as Record<string, unknown>)),
              ]
            : prev["organizations"],
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeOrgId, applyCache, publicMode]);

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
  const [referredBy, setReferredBy] = useState(() => String(initialReferralCode ?? "").trim().toUpperCase());
  const [step, setStep] = useState<Step>("details");
  const [checkinId, setCheckinId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [checkedIn, setCheckedIn] = useState<Row | null>(null);
  const [wheelPrize, setWheelPrize] = useState("");
  const [scratchPrize, setScratchPrize] = useState("");
  const [scratchStarted, setScratchStarted] = useState(false);
  const [rewardNotes, setRewardNotes] = useState("");
  const [codeCheck, setCodeCheck] = useState<WalkInCodeResult | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  const staffLabel = publicMode ? "Self walk-in" : user?.name ?? "Walk-in desk";

  const programs = useMemo(
    () => activePrograms((allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === String(activeOrgId)), effLocationId),
    [allRows, activeOrgId, effLocationId],
  );
  const wheelSegments = useMemo(() => {
    const loc = String(effLocationId ?? "");
    const all = (allRows[WHEEL_SEGMENTS] ?? []).filter((s) => String(s["orgId"]) === String(activeOrgId));
    const here = all.filter((s) => !s["locationId"] || String(s["locationId"]) === loc || String(s["locationId"]) === "0");
    return uniquePrizeCatalog(here.length ? here : all);
  }, [allRows, activeOrgId, effLocationId]);
  const scratchPrizes = useMemo(() => {
    const loc = String(effLocationId ?? "");
    const all = (allRows[SCRATCH_PRIZES] ?? []).filter(
      (p) => String(p["orgId"]) === String(activeOrgId) && String(p["active"] ?? "Yes") !== "No",
    );
    const here = all.filter((p) => !p["locationId"] || String(p["locationId"]) === loc || String(p["locationId"]) === "0");
    return uniquePrizeCatalog(here.length ? here : all);
  }, [allRows, activeOrgId, effLocationId]);

  const matchedCustomer = useMemo(
    () => findCustomerByPhoneInOrg(allRows["customers"] ?? [], phone, activeOrgId, effLocationId),
    [allRows, phone, activeOrgId, effLocationId],
  );
  const guestTier = String((checkedIn ?? matchedCustomer)?.["tier"] ?? "");
  const { scratch: showScratchGame, wheel: showWheelGame } = guestRewardGames(bookingSettings);
  const rewardMode = showWheelGame || showScratchGame ? "reward" : null;
  const phoneReady = isValidPhone(phone);
  const shareCode = matchedCustomer
    ? ensureCustomerReferralCode(matchedCustomer)
    : phoneReady && name.trim()
      ? referralCodeFor(name, phone)
      : "";

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

  useEffect(() => {
    const code = referredBy.trim();
    if (!code) {
      setCodeCheck(null);
      setCodeChecking(false);
      return;
    }
    let cancelled = false;
    setCodeChecking(true);
    const timer = window.setTimeout(() => {
      void validateWalkInCode(allRows, activeOrgId, code, phone, publicMode, {
        locationId: effLocationId,
        hasService: false,
      }).then((res) => {
        if (cancelled) return;
        setCodeCheck(res);
        setCodeChecking(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [referredBy, phone, activeOrgId, allRows, publicMode]);

  const today = new Date();
  const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const phoneCustomerIds = useMemo(() => {
    const digits = normalizePhone(phone);
    if (digits.length < 10) return [] as string[];
    return (allRows["customers"] ?? [])
      .filter(
        (c) => String(c["orgId"]) === String(activeOrgId) && normalizePhone(String(c["phone"] ?? "")) === digits,
      )
      .map((c) => String(c.id));
  }, [allRows, phone, activeOrgId]);
  const usedWalkInToday = phoneCustomerIds.length > 0 && (
    (allRows[QR_CHECKINS] ?? []).some(
      (c) => phoneCustomerIds.includes(String(c["customerId"])) && String(c["visitAt"] ?? "").slice(0, 10) === localDay,
    ) ||
    (allRows["wheelSpins"] ?? []).some(
      (s) => phoneCustomerIds.includes(String(s["customerId"])) && String(s["createdAt"] ?? s["createdon"] ?? "").slice(0, 10) === localDay,
    ) ||
    (allRows["scratchPlays"] ?? []).some(
      (s) => phoneCustomerIds.includes(String(s["customerId"])) && String(s["createdAt"] ?? s["createdon"] ?? "").slice(0, 10) === localDay,
    )
  );

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
    setReferredBy(String(initialReferralCode ?? "").trim().toUpperCase());
    setStep("details");
    setCheckinId("");
    setCustomerId("");
    setCheckedIn(null);
    setWheelPrize("");
    setScratchPrize("");
    setScratchStarted(false);
    setRewardNotes("");
  }

  async function checkIn() {
    if (!phoneReady) return void toast.error("Enter a valid 10-digit mobile number");
    if (!name.trim()) return void toast.error("Enter your name");
    if (!effLocationId) return void toast.error("Select an outlet first");
    if (usedWalkInToday) return void toast.info("Walk-in is once a day. This number already checked in today.");

    let offerCode: WalkInCodeResult = { ok: true };
    if (referredBy.trim()) {
      offerCode = await validateWalkInCode(allRows, activeOrgId, referredBy, phone, publicMode, {
        locationId: effLocationId,
        hasService: false,
      });
      setCodeCheck(offerCode);
      if (!offerCode.ok) return void toast.error(offerCode.reason ?? "Invalid coupon or referral code");
    }

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
        extra: {
          ...(dob ? { birthday: dob, dob } : {}),
        },
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
          {!matchedCustomer || !String(matchedCustomer["referredBy"] ?? "").trim() ? (
            <div>
              <Label className="mb-1.5">Referral or coupon code (optional)</Label>
              <Input
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                placeholder="MUTH5400"
                aria-invalid={!!referredBy.trim() && codeCheck?.ok === false}
              />
              {codeChecking ? (
                <p className="mt-1 text-xs text-muted-foreground">Checking code…</p>
              ) : codeCheck?.ok && referredBy.trim() ? (
                <p className="mt-1 text-xs text-emerald-700">{codeCheck.label}</p>
              ) : codeCheck && !codeCheck.ok ? (
                <p className="mt-1 text-xs text-destructive">{codeCheck.reason}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Friend’s referral applies once, on a first service booking at this salon — not on walk-in check-in.
                </p>
              )}
            </div>
          ) : null}
          {shareCode ? (
            <ReferralShareCard
              className="sm:col-span-2"
              code={shareCode}
              salonName={outletName || activeOrg.name}
              orgSlug={activeOrg.slug}
              locationId={effLocationId}
            />
          ) : null}
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
          {usedWalkInToday ? (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              This mobile number already used walk-in today. You can still open today&apos;s reward game.
            </p>
          ) : null}
          <Button
            className="w-full"
            type="button"
            onClick={() => {
              if (usedWalkInToday && matchedCustomer) {
                setCustomerId(String(matchedCustomer.id));
                setCheckedIn(matchedCustomer);
                setName(String(matchedCustomer["name"] ?? name));
                setStep(rewardMode ? "reward" : "done");
                return;
              }
              void checkIn();
            }}
            disabled={(usedWalkInToday && !matchedCustomer) || (!!referredBy.trim() && (codeChecking || codeCheck?.ok === false))}
          >
            {usedWalkInToday ? (rewardMode ? "See today's reward" : "Already used today") : "Check in & continue"}
          </Button>
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

      {(step === "reward" || step === "done") && showWheelGame ? (
        wheelSegments.length > 0 ? (
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
              {offerAvailWithinMessage(rewardDist.offerValidityDays, wheelPrize || alreadySpunToday) ? (
                <p className="mt-2 text-sm font-medium">{offerAvailWithinMessage(rewardDist.offerValidityDays, wheelPrize || alreadySpunToday)}</p>
              ) : null}
              {publicMode ? (
                <p className="mt-2 text-sm text-muted-foreground">Show this at the front desk when you pay.</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <SpinWheel
                segments={wheelSegments}
                tierWeights={rewardDist.wheel}
                availWithinDays={rewardDist.offerValidityDays}
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
                  toast.success(`You won: ${result.label}`, {
                    description: offerAvailWithinMessage(rewardDist.offerValidityDays, result.label),
                  });
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-violet-500/30 bg-card p-5 text-sm text-muted-foreground">
          Prize wheel is on for this salon, but no prizes are set up yet. Add them under Guest prizes.
        </div>
      )
      ) : null}

      {(step === "reward" || step === "done") && showScratchGame ? (
        scratchPrizes.length > 0 ? (
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-card to-amber-500/5 p-5 shadow-sm">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Layers className="size-5 text-amber-500" />
            Scratch card
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">One scratch per guest per day.</p>
          {alreadyScratchedToday && !scratchStarted ? (
            <div className="mt-4 space-y-3">
              <ScratchCard prizeLabel={alreadyScratchedToday} brandName={activeOrg.name} completed availWithinDays={rewardDist.offerValidityDays} onBegin={() => alreadyScratchedToday} />
              <p className="text-center text-sm">
                You earned: <strong>{alreadyScratchedToday}</strong>
              </p>
              {offerAvailWithinMessage(rewardDist.offerValidityDays, alreadyScratchedToday) ? (
                <p className="text-center text-sm font-medium">
                  {offerAvailWithinMessage(rewardDist.offerValidityDays, alreadyScratchedToday)}
                </p>
              ) : null}
              {publicMode ? (
                <p className="text-center text-sm text-muted-foreground">Use this on your next visit when you pay.</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <ScratchCard
                prizeLabel={scratchPrize}
                brandName={activeOrg.name}
                availWithinDays={rewardDist.offerValidityDays}
                onBegin={() => {
                  if (scratchStarted && scratchPrize) return scratchPrize;
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
                    setScratchStarted(true);
                    setStep("done");
                    toast.message("Already scratched today");
                    return result.label;
                  }
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not save scratch card");
                    return null;
                  }
                  setScratchPrize(result.label);
                  setScratchStarted(true);
                  if (checkinId) {
                    const mine = (allRows[QR_CHECKINS] ?? []).find((c) => String(c.id) === checkinId);
                    if (mine) {
                      update(QR_CHECKINS, checkinId, {
                        ...mine,
                        rewardEarned: `${mine["rewardEarned"]} · Scratch: ${result.label}`,
                      });
                    }
                  }
                  return result.label;
                }}
                onRevealed={(label) => {
                  setScratchPrize(label);
                  setStep("done");
                  toast.success(`You earned: ${label}`, {
                    description: offerAvailWithinMessage(rewardDist.offerValidityDays, label),
                  });
                }}
              />
              {scratchPrize ? (
                <p className="text-center text-sm">
                  You earned: <strong>{scratchPrize}</strong>
                  {offerAvailWithinMessage(rewardDist.offerValidityDays, scratchPrize) ? (
                    <span className="mt-1 block font-medium">
                      {offerAvailWithinMessage(rewardDist.offerValidityDays, scratchPrize)}
                    </span>
                  ) : null}
                  {publicMode ? (
                    <span className="mt-1 block text-muted-foreground">Use this on your next visit when you pay.</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-card p-5 text-sm text-muted-foreground">
          Scratch card is on for this salon, but no prizes are set up yet. Add them under Guest prizes.
        </div>
      )
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
    <div className="min-h-dvh bg-background px-3 py-6 sm:px-4 sm:py-8">
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <KriosLogo
          size={40}
          src={salonLogoUrl(activeOrg.logo || String(orgRow?.["logo"] ?? ""))}
          alt={activeOrg.name}
          wordmark={activeOrg.name}
          subtitle="Walk-in · no login required"
        />
        <p className="text-sm font-medium text-muted-foreground">{activeOrg.name}</p>
      </div>
      {content}
    </div>
  );
}
