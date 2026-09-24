import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Gift, MapPin, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWhatsAppSettings, type WhatsAppSettings } from "@/lib/whatsapp";
import { earnPoints, pointsToRupees, useLoyaltySettings } from "@/lib/loyalty-settings";
import { applyTierGames, useRewardDistribution } from "@/lib/reward-distribution";
import { RewardDistributionPanel } from "@/components/RewardDistributionPanel";
import { useBookingRules, type BookingRules } from "@/lib/booking-rules";
import { Switch } from "@/components/ui/switch";
import { useTenant } from "@/lib/tenant";
import { useCollection } from "@/lib/store";

const title = "Settings — Luxe Salon CRM";
const description = "Configure loyalty point conversion and the Meta WhatsApp Business API.";

const FIELDS: { name: keyof WhatsAppSettings; label: string; placeholder: string }[] = [
  { name: "displayNumber", label: "WhatsApp business number", placeholder: "+91 90000 00000" },
  { name: "phoneNumberId", label: "Phone number ID", placeholder: "1098xxxxxxxxxxx" },
  { name: "businessAccountId", label: "WhatsApp business account ID", placeholder: "2299xxxxxxxxxxx" },
  { name: "apiKey", label: "Permanent access token", placeholder: "EAAG…" },
  { name: "webhookToken", label: "Webhook verify token", placeholder: "luxe-verify-token" },
  { name: "apiVersion", label: "Graph API version", placeholder: "v21.0" },
];

export function Page() {
  const { settings, save, isConfigured } = useWhatsAppSettings();
  const { settings: loyalty, save: saveLoyalty } = useLoyaltySettings();
  const { config: rewardConfig, save: saveRewards } = useRewardDistribution();
  const { rules, save: saveRules } = useBookingRules();
  const { org, scopeLabel } = useTenant();
  const { rows: messages } = useCollection("whatsappMessages");
  const { rows: locationRows, update: updateLocation } = useCollection("locations");
  const [placeIds, setPlaceIds] = useState<Record<string, string>>({});
  const [form, setForm] = useState(settings);
  const [loyaltyForm, setLoyaltyForm] = useState(loyalty);
  const [rewardForm, setRewardForm] = useState(rewardConfig);
  const [bookingForm, setBookingForm] = useState<BookingRules>(rules);

  useEffect(() => setForm(settings), [settings]);
  useEffect(() => setLoyaltyForm(loyalty), [loyalty]);
  useEffect(() => setRewardForm(rewardConfig), [rewardConfig]);
  useEffect(() => setBookingForm(rules), [rules]);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const loc of locationRows) next[String(loc.id)] = String(loc["placeId"] ?? "");
    setPlaceIds(next);
  }, [locationRows]);

  const previewSpend = 1000;
  const previewEarn = earnPoints(previewSpend, loyaltyForm);
  const previewPts = 100;
  const previewCash = pointsToRupees(previewPts, loyaltyForm);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {org.name} · {scopeLabel} — rates saved here are stored on the server and used by POS billing ({loyalty.name}).
        </p>
      </header>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <h2 className="font-display text-lg">Loyalty points</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set how customers earn points on spend, and how those points convert back to rupees at billing.
        </p>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="earnUnitRupees" className="mb-1.5">
              Spend ₹ this many to earn points
            </Label>
            <Input
              id="earnUnitRupees"
              type="number"
              min={1}
              value={loyaltyForm.earnUnitRupees}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, earnUnitRupees: Number(e.target.value) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Glow Rewards: 100 means 1 point per ₹100.</p>
          </div>
          <div>
            <Label htmlFor="pointsPerUnit" className="mb-1.5">
              Points earned per unit
            </Label>
            <Input
              id="pointsPerUnit"
              type="number"
              min={1}
              value={loyaltyForm.pointsPerUnit}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, pointsPerUnit: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="rupeesPerPoint" className="mb-1.5">
              ₹ value of 1 point (redeem)
            </Label>
            <Input
              id="rupeesPerPoint"
              type="number"
              min={0}
              step="0.01"
              value={loyaltyForm.rupeesPerPoint}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, rupeesPerPoint: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="minSpend" className="mb-1.5">
              Minimum eligible spend
            </Label>
            <Input
              id="minSpend"
              type="number"
              min={0}
              value={loyaltyForm.minSpend}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, minSpend: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p>
            Spend ₹{previewSpend.toLocaleString("en-IN")} → earn <strong>{previewEarn}</strong> points
            {loyaltyForm.minSpend ? ` (min spend ₹${loyaltyForm.minSpend})` : ""}
          </p>
          <p className="mt-1">
            Redeem {previewPts} points → <strong>₹{previewCash.toLocaleString("en-IN")}</strong> off
          </p>
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            void saveLoyalty(loyaltyForm);
          }}
        >
          <CheckCircle2 /> Save loyalty rates
        </Button>
      </section>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <h2 className="font-display text-lg">Reward tiers</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose, for each tier, whether the guest gets a scratch card, a prize wheel, or both — and how many prizes
          of that tier are on each game. A discount prize stays pending until the next POS bill.
        </p>
        <Separator className="my-4" />
        <RewardDistributionPanel value={rewardForm} onChange={setRewardForm} />
        <Button
          className="mt-5"
          onClick={() => {
            saveRewards(applyTierGames(rewardForm));
            toast.success("Reward tiers saved");
          }}
        >
          <CheckCircle2 /> Save reward tiers
        </Button>
      </section>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          <h2 className="font-display text-lg">Appointment slots & booking rules</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Opening hours, slot length, and how far ahead a guest can book. Public booking on your salon page uses these rules.
        </p>
        <Separator className="my-4" />
        <div className="divide-y divide-border rounded-lg border border-border">
          {bookingForm.hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Switch
                checked={h.open}
                onCheckedChange={(checked) =>
                  setBookingForm((p) => ({
                    ...p,
                    hours: p.hours.map((x, xi) => (xi === i ? { ...x, open: checked } : x)),
                  }))
                }
              />
              <span className="w-24 text-sm">{h.day}</span>
              {h.open ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    value={h.from}
                    onChange={(e) =>
                      setBookingForm((p) => ({
                        ...p,
                        hours: p.hours.map((x, xi) => (xi === i ? { ...x, from: e.target.value } : x)),
                      }))
                    }
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={h.to}
                    onChange={(e) =>
                      setBookingForm((p) => ({
                        ...p,
                        hours: p.hours.map((x, xi) => (xi === i ? { ...x, to: e.target.value } : x)),
                      }))
                    }
                  />
                </div>
              ) : (
                <Badge variant="secondary">Closed</Badge>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slotDuration" className="mb-1.5">Slot duration (minutes)</Label>
            <Input id="slotDuration" type="number" min={5} value={bookingForm.duration} onChange={(e) => setBookingForm((p) => ({ ...p, duration: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="slotBuffer" className="mb-1.5">Buffer between appointments (minutes)</Label>
            <Input id="slotBuffer" type="number" min={0} value={bookingForm.buffer} onChange={(e) => setBookingForm((p) => ({ ...p, buffer: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="maxPerSlot" className="mb-1.5">Max bookings per slot</Label>
            <Input id="maxPerSlot" type="number" min={1} value={bookingForm.maxPerSlot} onChange={(e) => setBookingForm((p) => ({ ...p, maxPerSlot: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="advanceDays" className="mb-1.5">Advance booking days</Label>
            <Input id="advanceDays" type="number" min={1} value={bookingForm.advanceDays} onChange={(e) => setBookingForm((p) => ({ ...p, advanceDays: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="minNotice" className="mb-1.5">Minimum booking notice (hours)</Label>
            <Input id="minNotice" type="number" min={0} value={bookingForm.minNotice} onChange={(e) => setBookingForm((p) => ({ ...p, minNotice: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Switch checked={bookingForm.onlineBooking} onCheckedChange={(checked) => setBookingForm((p) => ({ ...p, onlineBooking: checked }))} />
          <span className="text-sm">Allow customers to book online</span>
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            saveRules(bookingForm);
            toast.success("Booking rules saved");
          }}
        >
          <CheckCircle2 /> Save booking rules
        </Button>
      </section>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <h2 className="font-display text-lg">Google Maps listings</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          After the outlet is published on Google Maps, paste its Place ID. Feedback stores those comments and
          refreshes from Google when stale or when you click Refresh. Find a Place ID with Google&apos;s{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
            target="_blank"
            rel="noreferrer"
          >
            Place ID finder
          </a>
          . Live pull needs <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code>.
        </p>
        <Separator className="my-4" />
        <div className="space-y-4">
          {locationRows.map((loc) => (
            <div key={String(loc.id)}>
              <Label htmlFor={`place-${loc.id}`} className="mb-1.5">
                {String(loc["name"])} — Place ID
              </Label>
              <Input
                id={`place-${loc.id}`}
                value={placeIds[String(loc.id)] ?? ""}
                placeholder="ChIJ…"
                onChange={(e) => setPlaceIds((p) => ({ ...p, [String(loc.id)]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            for (const loc of locationRows) {
              updateLocation(String(loc.id), { ...loc, placeId: placeIds[String(loc.id)] ?? "" });
            }
            toast.success("Google Place IDs saved");
          }}
        >
          <CheckCircle2 /> Save Place IDs
        </Button>
      </section>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlugZap className="size-5 text-primary" />
            <h2 className="font-display text-lg">Meta WhatsApp Business API</h2>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name} className="mb-1.5">
                {f.label}
              </Label>
              <Input
                id={f.name}
                value={String(form[f.name] ?? "")}
                placeholder={f.placeholder}
                type={f.name === "apiKey" ? "password" : "text"}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              save({ ...form, connected: true });
              toast.success("WhatsApp API connected", { description: form.displayNumber || org.name });
            }}
          >
            <CheckCircle2 /> Save & connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              save({ ...form, connected: false });
              toast.message("Disconnected — messages will be queued");
            }}
          >
            Disconnect
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg">Message log</h2>
          <Badge variant="secondary">{messages.length} messages</Badge>
        </div>
        {messages.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No WhatsApp messages sent from this location yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((m) => (
              <li key={String(m.id)} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {String(m["recipient"])} · {String(m["to"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(m["kind"])} {String(m["reference"])} · {String(m["sentAt"])}
                  </p>
                </div>
                <Badge variant={String(m["status"]).startsWith("Sent") ? "default" : "secondary"}>
                  {String(m["status"])}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
