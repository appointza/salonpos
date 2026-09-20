import type { Row } from "@/lib/store";
import {
  APPLIES_TO,
  CUSTOMER_SEGMENTS,
  DISCOUNT_TYPES,
  PAYMENT_METHODS,
  USAGE_LIMITS,
  WEEKDAYS,
  COUPON_STATUSES,
  type DiscountSlab,
  type DiscountType,
} from "@/lib/coupons/coupon-schema";
import { parseDiscountSlabs } from "@/lib/coupons/coupon-engine";
import { couponConditionsSummary, couponHeadline, describeCoupon, normalizeCoupon } from "@/lib/coupons/coupon-engine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { previewPoolCodes } from "@/lib/coupons/coupon-code-pool";

export function CouponForm({
  value,
  onChange,
  locations = [],
}: {
  value: Row;
  onChange: (next: Row) => void;
  locations?: { locationId: string; name: string }[];
}) {
  const discountType = String(value["discountType"] ?? "percentage") as DiscountType;
  const normalized = normalizeCoupon(value, "coupons");
  const validDays = String(value["validDays"] ?? "all").split(",").filter(Boolean);
  const slabs = parseDiscountSlabs(String(value["discountSlabs"] ?? ""));

  function updateSlabs(next: DiscountSlab[]) {
    onChange({ ...value, discountSlabs: JSON.stringify(next) });
  }

  function toggleDay(day: string) {
    if (day === "all") {
      onChange({ ...value, validDays: "all" });
      return;
    }
    const set = new Set(validDays.filter((d) => d !== "all"));
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange({ ...value, validDays: set.size ? [...set].join(",") : "all" });
  }

  return (
    <div className="grid gap-5 py-1">
      <section className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Coupon scheme</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Coupon name</Label>
            <Input
              value={String(value["title"] ?? "")}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="Birthday Offer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scheme reference code</Label>
            <Input
              value={String(value["code"] ?? "")}
              onChange={(e) =>
                onChange({
                  ...value,
                  code: e.target.value.toUpperCase(),
                  codePrefix: String(value["codePrefix"] ?? e.target.value).toUpperCase() || e.target.value.toUpperCase(),
                })
              }
              placeholder="BDAY"
              className="font-mono uppercase"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Campaign tag (optional)</Label>
          <Input
            value={String(value["campaignTag"] ?? "")}
            onChange={(e) => onChange({ ...value, campaignTag: e.target.value })}
            placeholder="BIRTHDAY, FESTIVE"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={String(value["description"] ?? "")}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="For new guests on their first service booking"
            rows={2}
          />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Discount</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Coupon type</Label>
            <Select
              value={discountType}
              onValueChange={(v) => onChange({ ...value, discountType: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Applies to</Label>
            <Select
              value={String(value["appliesTo"] ?? "entire_bill")}
              onValueChange={(v) => onChange({ ...value, appliesTo: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPLIES_TO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(discountType === "percentage" || discountType === "fixed_amount") && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{discountType === "percentage" ? "Percentage" : "Amount (₹)"}</Label>
              <Input
                type="number"
                min={0}
                value={Number(value["discountValue"] ?? 0)}
                onChange={(e) => onChange({ ...value, discountValue: Number(e.target.value) || 0 })}
              />
            </div>
            {discountType === "percentage" ? (
              <div className="space-y-1.5">
                <Label>Max discount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={Number(value["maxDiscount"] ?? 0)}
                  onChange={(e) => onChange({ ...value, maxDiscount: Number(e.target.value) || 0 })}
                  placeholder="0 = no cap"
                />
              </div>
            ) : null}
          </div>
        )}

        {discountType === "flat_price" && (
          <div className="space-y-1.5">
            <Label>Flat price (₹)</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["flatPrice"] ?? 0)}
              onChange={(e) => onChange({ ...value, flatPrice: Number(e.target.value) || 0 })}
            />
          </div>
        )}

        {discountType === "buy_x_get_y" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Buy qty</Label>
              <Input
                type="number"
                min={1}
                value={Number(value["buyQty"] ?? 2)}
                onChange={(e) => onChange({ ...value, buyQty: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Free qty</Label>
              <Input
                type="number"
                min={1}
                value={Number(value["freeQty"] ?? 1)}
                onChange={(e) => onChange({ ...value, freeQty: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Item name</Label>
              <Input
                value={String(value["freeItemName"] ?? "service")}
                onChange={(e) => onChange({ ...value, freeItemName: e.target.value })}
              />
            </div>
          </div>
        )}

        {discountType === "slab_based" && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <Label>Bill slabs</Label>
            {slabs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add at least one slab (e.g. ₹500–₹999 → ₹50 off).</p>
            ) : (
              <div className="space-y-2">
                {slabs.map((slab, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={slab.minBill}
                      onChange={(e) => {
                        const next = [...slabs];
                        next[idx] = { ...slab, minBill: Number(e.target.value) || 0 };
                        updateSlabs(next);
                      }}
                      placeholder="Min bill"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={slab.maxBill}
                      onChange={(e) => {
                        const next = [...slabs];
                        next[idx] = { ...slab, maxBill: Number(e.target.value) || 0 };
                        updateSlabs(next);
                      }}
                      placeholder="Max bill (0 = no cap)"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={slab.discount}
                      onChange={(e) => {
                        const next = [...slabs];
                        next[idx] = { ...slab, discount: Number(e.target.value) || 0 };
                        updateSlabs(next);
                      }}
                      placeholder="Discount ₹"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => updateSlabs(slabs.filter((_, i) => i !== idx))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateSlabs([...slabs, { minBill: 500, maxBill: 999, discount: 50 }])}
            >
              Add slab
            </Button>
          </div>
        )}

        {(discountType === "free_service" || discountType === "free_addon") && (
          <div className="space-y-1.5">
            <Label>Free item / service name</Label>
            <Input
              value={String(value["freeItemName"] ?? "")}
              onChange={(e) => onChange({ ...value, freeItemName: e.target.value })}
              placeholder="Head massage, blow-dry…"
            />
          </div>
        )}

        {String(value["appliesTo"] ?? "") !== "entire_bill" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Target IDs (comma-separated)</Label>
              <Input
                value={String(value["targetIds"] ?? "")}
                onChange={(e) => onChange({ ...value, targetIds: e.target.value })}
                placeholder="S-01, hair, retail"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target names (display)</Label>
              <Input
                value={String(value["targetNames"] ?? "")}
                onChange={(e) => onChange({ ...value, targetNames: e.target.value })}
                placeholder="Haircut, Hair colour"
              />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conditions</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Eligible locations</Label>
            <div className="flex flex-wrap gap-1">
              {locations.map((loc) => {
                const selected = String(value["eligibleLocationIds"] ?? "")
                  .split(",")
                  .filter(Boolean)
                  .includes(loc.locationId);
                return (
                  <Badge
                    key={loc.locationId}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const set = new Set(
                        String(value["eligibleLocationIds"] ?? "")
                          .split(",")
                          .filter(Boolean),
                      );
                      if (set.has(loc.locationId)) set.delete(loc.locationId);
                      else set.add(loc.locationId);
                      onChange({ ...value, eligibleLocationIds: [...set].join(",") });
                    }}
                  >
                    {loc.name}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Leave none selected to allow all outlets on this scheme row.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Customer segment</Label>
            <Select
              value={String(value["customerSegment"] ?? "all")}
              onValueChange={(v) => onChange({ ...value, customerSegment: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_SEGMENTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Specific customer ID (optional)</Label>
            <Input
              value={String(value["targetCustomerId"] ?? "")}
              onChange={(e) => onChange({ ...value, targetCustomerId: e.target.value })}
              placeholder="C-1001 — leave blank for segment rules"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={String(value["paymentMethod"] ?? "Any")}
              onValueChange={(v) => onChange({ ...value, paymentMethod: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Min bill (₹)</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["minBillAmount"] ?? 0)}
              onChange={(e) => onChange({ ...value, minBillAmount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min quantity</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["minQuantity"] ?? 0)}
              onChange={(e) => onChange({ ...value, minQuantity: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min booking (₹)</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["minBookingValue"] ?? 0)}
              onChange={(e) => onChange({ ...value, minBookingValue: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Inactive days (for comeback offers)</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["inactiveDays"] ?? 90)}
              onChange={(e) => onChange({ ...value, inactiveDays: Number(e.target.value) || 90 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Advance booking (days)</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["advanceBookingDays"] ?? 0)}
              onChange={(e) => onChange({ ...value, advanceBookingDays: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First appointment only</Label>
            <Select
              value={String(value["firstAppointmentOnly"] ?? "No")}
              onValueChange={(v) => onChange({ ...value, firstAppointmentOnly: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Staff ID (optional)</Label>
            <Input
              value={String(value["staffId"] ?? "")}
              onChange={(e) => onChange({ ...value, staffId: e.target.value })}
              placeholder="ST-101"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Validity</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={String(value["validityStart"] ?? "")}
              onChange={(e) => onChange({ ...value, validityStart: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={String(value["validityEnd"] ?? "")}
              onChange={(e) => onChange({ ...value, validityEnd: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Time from</Label>
            <Input
              type="time"
              value={String(value["validTimeStart"] ?? "")}
              onChange={(e) => onChange({ ...value, validTimeStart: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time until</Label>
            <Input
              type="time"
              value={String(value["validTimeEnd"] ?? "")}
              onChange={(e) => onChange({ ...value, validTimeEnd: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Valid days</Label>
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={validDays.includes("all") || validDays.length === 0 ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleDay("all")}
            >
              All days
            </Badge>
            {WEEKDAYS.map((d) => (
              <Badge
                key={d.value}
                variant={validDays.includes(d.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleDay(d.value)}
              >
                {d.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Flash end (optional)</Label>
          <Input
            type="datetime-local"
            value={String(value["flashEndsAt"] ?? "").replace(" ", "T").slice(0, 16)}
            onChange={(e) => onChange({ ...value, flashEndsAt: e.target.value.replace("T", " ") })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Allow with other discounts</Label>
            <Select
              value={String(value["allowWithOtherDiscounts"] ?? "Yes")}
              onValueChange={(v) => onChange({ ...value, allowWithOtherDiscounts: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Allow with loyalty redemption</Label>
            <Select
              value={String(value["allowWithLoyalty"] ?? "Yes")}
              onValueChange={(v) => onChange({ ...value, allowWithLoyalty: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-muted/15 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Coupon code configuration</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Prefix</Label>
            <Input
              value={String(value["codePrefix"] ?? value["code"] ?? "")}
              onChange={(e) => onChange({ ...value, codePrefix: e.target.value.toUpperCase() })}
              placeholder="GOLD"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Suffix</Label>
            <Input
              value={String(value["codeSuffix"] ?? "")}
              onChange={(e) => onChange({ ...value, codeSuffix: e.target.value.toUpperCase() })}
              placeholder="2026"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Starting number</Label>
            <Input
              type="number"
              min={1}
              value={Number(value["codeStartNumber"] ?? 1)}
              onChange={(e) => onChange({ ...value, codeStartNumber: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Number length</Label>
            <Input
              type="number"
              min={3}
              max={8}
              value={Number(value["codeLength"] ?? 4)}
              onChange={(e) => onChange({ ...value, codeLength: Number(e.target.value) || 4 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Coupon quantity</Label>
            <Input
              type="number"
              min={0}
              value={Number(value["couponQuantity"] ?? value["totalUsageLimit"] ?? 100)}
              onChange={(e) =>
                onChange({
                  ...value,
                  couponQuantity: Number(e.target.value) || 0,
                  totalUsageLimit: Number(e.target.value) || 0,
                  usageLimitMode: "limited_total",
                  autoGenerateCodes: "Yes",
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Auto-generate unique codes</Label>
            <Select
              value={String(value["autoGenerateCodes"] ?? "Yes")}
              onValueChange={(v) => onChange({ ...value, autoGenerateCodes: v, usageLimitMode: "limited_total" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Preview</p>
          <p className="mt-1 font-mono">
            {previewPoolCodes(value, 3).join(" · ") || "Set prefix and quantity to preview"}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Usage limits</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Usage mode</Label>
            <Select
              value={String(value["usageLimitMode"] ?? "per_customer")}
              onValueChange={(v) => onChange({ ...value, usageLimitMode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USAGE_LIMITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={String(value["status"] ?? "Draft")}
              onValueChange={(v) => onChange({ ...value, status: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUPON_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s === "Inactive" ? "Inactive" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Usage per customer</Label>
            <Input
              type="number"
              min={1}
              value={Number(value["perCustomerLimit"] ?? 1)}
              onChange={(e) => onChange({ ...value, perCustomerLimit: Number(e.target.value) || 1 })}
            />
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</p>
        <p className="mt-1 font-mono font-semibold">{String(value["code"] ?? "CODE")}</p>
        <p className="mt-1 font-medium">{couponHeadline(normalized)}</p>
        <p className="text-muted-foreground">{describeCoupon(normalized)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{couponConditionsSummary(normalized)}</p>
      </div>
    </div>
  );
}
