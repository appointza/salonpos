import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinWheel } from "@/components/SpinWheel";
import { useData, type Row } from "@/lib/store";
import { upsertCustomerByPhone } from "@/lib/customers/customer-service";
import { normalizePhone } from "@/lib/customers/customer-lookup";
import {
  DEMO_OTP,
  QR_CHECKINS,
  WHEEL_SEGMENTS,
  QR_OFFERS,
  activePrograms,
  findCustomerByPhone,
  isBirthdayWindow,
  programOfType,
  referralCodeFor,
  waCatalogLink,
} from "@/lib/qr-loyalty";
import { autoApproveCheckin, hasApprovedCheckinToday } from "@/lib/checkins/checkin-service";
import { customerSpunToday, processWheelSpinResult } from "@/lib/wheel/wheel-service";

export function QrCheckinPage() {
  const { locationId } = Route.useParams();
  const { allRows, create, update } = useData();
  const location = (allRows["locations"] ?? []).find((l) => String(l["locationId"] ?? l.id) === locationId);
  const orgId = String(location?.["orgId"] ?? "");
  const org = (allRows["organizations"] ?? []).find((o) => String(o["orgId"]) === orgId);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [consent, setConsent] = useState(true);
  const [checkinId, setCheckinId] = useState("");
  const [spun, setSpun] = useState("");
  const [cart, setCart] = useState<string[]>([]);

  const customers = useMemo(
    () => (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId),
    [allRows, orgId],
  );
  const programs = useMemo(
    () => activePrograms((allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === orgId), locationId),
    [allRows, orgId, locationId],
  );
  const services = useMemo(
    () =>
      (allRows["services"] ?? []).filter(
        (s) => String(s["orgId"]) === orgId && String(s["active"] ?? "Yes") !== "No",
      ),
    [allRows, orgId],
  );
  const segments = useMemo(
    () =>
      (allRows[WHEEL_SEGMENTS] ?? []).filter(
        (s) => String(s["orgId"]) === orgId && String(s["programId"] ?? "LY-WHEEL") === "LY-WHEEL",
      ),
    [allRows, orgId],
  );
  const offers = useMemo(
    () =>
      (allRows[QR_OFFERS] ?? []).filter(
        (o) => String(o["orgId"]) === orgId && String(o["status"]) === "Active",
      ),
    [allRows, orgId],
  );
  const checkins = allRows[QR_CHECKINS] ?? [];
  const mine = checkins.find((c) => String(c.id) === checkinId);
  const existing = findCustomerByPhone(customers, phone);
  const stamp = programOfType(programs, "Stamp Card");
  const wheel = programOfType(programs, "Spin the Wheel");
  const stampsHave = Number((existing ?? {})["stampsCurrent"] ?? 0);
  const stampsNeed = Number(stamp?.["stampsRequired"] ?? 8);

  useEffect(() => {
    if (existing) {
      setName(String(existing["name"] ?? ""));
      setBirthday(String(existing["birthday"] ?? ""));
      setAnniversary(String(existing["anniversary"] ?? ""));
    }
  }, [existing]);

  if (!location) {
    return <p className="p-8 text-center text-sm text-muted-foreground">This QR is not linked to an outlet.</p>;
  }

  const outlet = String(location["name"]);
  const approved = String(mine?.["status"] ?? "") === "Approved";
  const customerId = String(mine?.["customerId"] ?? existing?.id ?? "");
  const wheelBlocked = customerId ? customerSpunToday(allRows, customerId) : false;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="font-display text-lg leading-tight">{String(org?.["name"] ?? "Luxe Salon")}</p>
          <p className="text-xs text-muted-foreground">{outlet} · check-in only, no booking</p>
        </div>
      </div>

      {!verified ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h1 className="font-display text-2xl">Scan & check in</h1>
          <p className="text-sm text-muted-foreground">WhatsApp OTP first, SMS if WhatsApp fails. Demo code is {DEMO_OTP}.</p>
          <div>
            <Label className="mb-1.5">Mobile number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
          </div>
          <div>
            <Label className="mb-1.5">OTP</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder={DEMO_OTP} />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (normalizeLen(phone) < 10) return void toast.error("Enter a 10-digit mobile");
              if (otp.trim() !== DEMO_OTP) return void toast.error("OTP did not match — try 123456");
              setVerified(true);
              toast.success("Verified on WhatsApp");
            }}
          >
            Verify & continue
          </Button>
        </div>
      ) : !mine ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h1 className="font-display text-2xl">{existing ? `Welcome back, ${existing["name"]}` : "First visit"}</h1>
          <div>
            <Label className="mb-1.5">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Birthday</Label>
              <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Anniversary</Label>
              <Input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I agree to loyalty messages (DPDP)
          </label>
          {stamp ? (
            <p className="text-sm text-muted-foreground">
              Stamp card: {stampsHave}/{stampsNeed} — {String(stamp["rewardDescription"] ?? "")}
            </p>
          ) : null}
          {isBirthdayWindow(birthday) ? <Badge>Birthday offer this week</Badge> : null}
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return void toast.error("Enter your name");
              if (!consent) return void toast.error("Consent is required");
              let customer = existing;
              if (!customer) {
                customer = upsertCustomerByPhone(
                  { db: allRows, create, update },
                  {
                    orgId,
                    name: name.trim(),
                    phone,
                    locationId,
                    outlet,
                    extra: {
                      email: "",
                      gender: "",
                      birthday,
                      anniversary,
                      household: "",
                      referralCode: referralCodeFor(name, phone),
                      marketingConsent: "Yes",
                    },
                  },
                );
              } else {
                update("customers", String(customer.id), {
                  ...customer,
                  name: name.trim(),
                  birthday,
                  anniversary,
                  marketingConsent: "Yes",
                });
              }
              const cid = String(customer.id);
              const todayCheckin = (allRows[QR_CHECKINS] ?? []).find(
                (c) =>
                  String(c["customerId"]) === cid &&
                  String(c["status"]) === "Approved" &&
                  String(c["visitAt"] ?? "").startsWith(new Date().toISOString().slice(0, 10)),
              );
              if (todayCheckin) {
                setCheckinId(String(todayCheckin.id));
                toast.info("You already checked in today", {
                  description: String(todayCheckin["rewardEarned"] ?? "Rewards already applied"),
                });
                return;
              }
              if (hasApprovedCheckinToday(allRows, cid)) {
                const existingToday = (allRows[QR_CHECKINS] ?? []).find(
                  (c) =>
                    String(c["customerId"]) === cid &&
                    String(c["status"]) === "Approved" &&
                    String(c["visitAt"] ?? "").startsWith(new Date().toISOString().slice(0, 10)),
                );
                if (existingToday) {
                  setCheckinId(String(existingToday.id));
                  toast.info("You already checked in today");
                  return;
                }
              }
              const id = `CK-${Math.floor(1000 + Math.random() * 9000)}`;
              const checkinRow: Row = {
                id,
                customerId: String(customer.id),
                customer: name.trim(),
                phone,
                staffId: "",
                staff: "Self check-in",
                billAmount: 0,
                rewardEarned: "",
                verification: "OTP-WhatsApp",
                status: "Pending",
                visitAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                locationId,
              };
              create(QR_CHECKINS, checkinRow, orgId);
              const store = { db: allRows, create, update };
              const result = autoApproveCheckin(store, {
                checkin: checkinRow,
                customer,
                programs,
                billAmount: 0,
                birthdayBonus: isBirthdayWindow(birthday),
                locationId,
                orgId,
              });
              if (!result.ok) {
                toast.error(result.error ?? "Could not complete check-in");
                return;
              }
              update(QR_CHECKINS, id, {
                ...checkinRow,
                status: "Approved",
                staff: "Self check-in",
                rewardEarned: result.notes,
              });
              setCheckinId(id);
              toast.success("You're checked in!", { description: result.notes });
            }}
          >
            Check in now
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-xl">{name}</h1>
              <Badge variant={approved ? "default" : "secondary"}>{String(mine["status"])}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {approved
                ? String(mine["rewardEarned"] || "Visit recorded — rewards applied")
                : "Completing your check-in…"}
            </p>
            {stamp && approved ? (
              <p className="mt-3 text-sm">
                Stamps{" "}
                {Number(
                  (allRows["customers"] ?? []).find((c) => String(c.id) === customerId)?.["stampsCurrent"] ??
                    stampsHave,
                )}
                /{stampsNeed}
              </p>
            ) : null}
          </div>

          {approved && wheel && !spun && !wheelBlocked ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium">Your prize wheel</p>
              <SpinWheel
                segments={segments}
                onResult={(seg) => {
                  if (!customerId) return;
                  const store = { db: allRows, create, update };
                  const result = processWheelSpinResult(store, {
                    customerId,
                    segment: seg,
                    locationId,
                    orgId,
                    programId: "LY-WHEEL",
                    source: "qr",
                    checkinId: String(mine?.id ?? ""),
                  });
                  if (result.duplicate) {
                    toast.message("Wheel already used today");
                    setSpun(result.label);
                    return;
                  }
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not save spin");
                    return;
                  }
                  setSpun(result.label);
                  if (mine) {
                    update(QR_CHECKINS, String(mine.id), {
                      ...mine,
                      rewardEarned: `${mine["rewardEarned"]} · Wheel: ${result.label}`,
                    });
                  }
                  toast.success(`You won: ${result.label}`);
                }}
              />
            </div>
          ) : null}
          {wheelBlocked && !spun ? (
            <p className="text-sm text-muted-foreground">Prize wheel already used today.</p>
          ) : null}
          {spun ? <p className="text-sm">Wheel result: <strong>{spun}</strong> — show this at the desk.</p> : null}

          {offers.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium">Live offers</p>
              <ul className="space-y-2 text-sm">
                {offers.map((o) => (
                  <li key={String(o.id)}>
                    <span className="font-medium">{String(o["title"])}</span>
                    <span className="text-muted-foreground"> — {String(o["description"])}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium">Service list</p>
            <ul className="space-y-2">
              {services.slice(0, 12).map((s) => {
                const line = `${s["name"]} · ₹${Number(s["price"] ?? 0).toLocaleString("en-IN")}`;
                const on = cart.includes(line);
                return (
                  <li key={String(s.id)} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {String(s["name"])}
                      <span className="text-muted-foreground">
                        {" "}
                        · ₹{Number(s["price"] ?? 0).toLocaleString("en-IN")}
                        {s["duration"] ? ` · ${s["duration"]} min` : ""}
                      </span>
                    </span>
                    <Button size="sm" variant={on ? "secondary" : "outline"} onClick={() => setCart((c) => (on ? c.filter((x) => x !== line) : [...c, line]))}>
                      {on ? "Added" : "Add"}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button
              className="mt-4 w-full"
              disabled={cart.length === 0}
              onClick={() => {
                window.open(waCatalogLink(String(location["phone"] ?? "919000000000"), outlet, cart), "_blank");
              }}
            >
              Send cart on WhatsApp
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Pay at venue. No app download.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeLen(phone: string) {
  return normalizePhone(phone).length;
}
