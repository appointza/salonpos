import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPublishedService } from "@/pages/Book/booking";
import {
  referralRewardLabel,
  useReferralRules,
  type ReferralRewardType,
  type ReferralRules,
} from "@/pages/Loyalty/referral-settings";
import { listReferralRecords, listReferrers } from "@/pages/Loyalty/referral-service";
import { useCollection, useData } from "@/store";
import { useTenant } from "@/tenant";

export function ReferralPanel() {
  const { orgId } = useTenant();
  const { rules, save } = useReferralRules();
  const { allRows } = useData();
  const { rows: services } = useCollection("services");
  const [form, setForm] = useState<ReferralRules>(rules);

  useEffect(() => setForm(rules), [rules]);

  const published = useMemo(() => services.filter(isPublishedService), [services]);
  const referrers = useMemo(() => listReferrers(allRows, orgId), [allRows, orgId]);
  const records = useMemo(() => listReferralRecords(allRows, orgId), [allRows, orgId]);

  function patch<K extends keyof ReferralRules>(key: K, value: ReferralRules[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-5 text-primary" />
        <h2 className="font-display text-lg">Referral</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Guests who send a new customer to this salon earn an offer you choose. The code applies once, only on that
        guest&apos;s first service booking at this shop — not on walk-in check-in, membership-only, or a return visit.
        The reward sits on the referrer&apos;s next POS bill (or as points).
      </p>
      <Separator className="my-4" />
      <div className="flex items-center gap-3">
        <Switch checked={form.enabled} onCheckedChange={(checked) => patch("enabled", checked)} />
        <span className="text-sm">Give a reward when someone is referred</span>
      </div>
      <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5">Referrer gets</Label>
          <Select
            value={form.rewardType}
            onValueChange={(value) => patch("rewardType", value as ReferralRewardType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage off</SelectItem>
              <SelectItem value="flat">Fixed rupee off</SelectItem>
              <SelectItem value="free-service">Free service</SelectItem>
              <SelectItem value="points">Loyalty points</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.rewardType === "free-service" ? (
          <div>
            <Label className="mb-1.5">Free service</Label>
            <Select value={form.serviceId ? String(form.serviceId) : undefined} onValueChange={(v) => patch("serviceId", Number(v) || 0)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a service" />
              </SelectTrigger>
              <SelectContent>
                {published.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s["name"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label className="mb-1.5">
              {form.rewardType === "percentage" ? "Percent" : form.rewardType === "flat" ? "Rupees" : "Points"}
            </Label>
            <Input
              type="number"
              min={0}
              value={form.rewardValue}
              onChange={(e) => patch("rewardValue", Number(e.target.value) || 0)}
            />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Switch checked={form.rewardNewGuest} onCheckedChange={(checked) => patch("rewardNewGuest", checked)} />
        <span className="text-sm">Also give the same offer to the new guest</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Preview: {referralRewardLabel(form, published)}</p>
      <Button
        className="mt-5"
        onClick={() => {
          if (form.rewardType === "free-service" && !form.serviceId) {
            toast.error("Pick the free service for the referral offer");
            return;
          }
          save(form);
          toast.success("Referral offer saved");
        }}
      >
        <CheckCircle2 /> Save referral offer
      </Button>

      <h3 className="mt-10 font-display text-base">Who is referring</h3>
      <p className="mt-1 text-sm text-muted-foreground">People whose codes brought guests into this organisation.</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Mobile</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Guests</th>
              <th className="px-3 py-2 font-medium">Last referred</th>
            </tr>
          </thead>
          <tbody>
            {referrers.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                  No referrals yet. Guests enter a code at walk-in or online booking.
                </td>
              </tr>
            ) : (
              referrers.map((row) => (
                <tr key={row.id || row.code} className="border-t border-border">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.phone || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.guests}</td>
                  <td className="px-3 py-2">{row.lastAt || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 font-display text-base">Referral history</h3>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Referrer</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">New guest</th>
              <th className="px-3 py-2 font-medium">Guest mobile</th>
              <th className="px-3 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                  No referred guests yet.
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">{row.referrerName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.referrerCode}</td>
                  <td className="px-3 py-2">{row.guestName}</td>
                  <td className="px-3 py-2">{row.guestPhone || "—"}</td>
                  <td className="px-3 py-2">{row.referredAt || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
