import type { EntityId } from "@/lib/ids";
import { useMemo, useState } from "react";
import { AlertCircle, TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillLine } from "@/lib/pos";
import type { Row } from "@/lib/store";
import { validateCouponCodeAtPos, type AppliedCouponLine } from "@/lib/coupons/coupon-pos";
import { listCustomerVouchers } from "@/lib/vouchers/voucher-service";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function PosCouponInput({
  customer,
  cart,
  orgId,
  locationId,
  payment,
  staffId,
  discount,
  membershipDiscount,
  allRows,
  appliedCodes,
  appliedLines,
  onChange,
}: {
  customer: Row | null;
  cart: BillLine[];
  orgId: EntityId;
  locationId: EntityId;
  payment: string;
  staffId: EntityId;
  discount: number;
  membershipDiscount: number;
  allRows: Record<string, Row[]>;
  appliedCodes: string[];
  /** Quoted discount per code from quoteUnifiedSale — keeps preview aligned with checkout. */
  appliedLines?: AppliedCouponLine[];
  onChange: (codes: string[]) => void;
}) {
  const [code, setCode] = useState("");
  const [lastError, setLastError] = useState("");

  const wallet = useMemo(
    () => (customer ? listCustomerVouchers(allRows, String(customer.id), orgId) : []),
    [customer, allRows, orgId],
  );

  const lineByCode = useMemo(() => {
    const map = new Map<string, AppliedCouponLine>();
    for (const line of appliedLines ?? []) {
      map.set(line.code.toLowerCase(), line);
    }
    return map;
  }, [appliedLines]);

  function applyCode(raw: string) {
    setLastError("");
    if (!customer) return void toast.error("Select a customer before applying a coupon");
    if (cart.length === 0) return void toast.error("Add items to the cart first");
    const next = raw.trim();
    if (!next) return;

    if (appliedCodes.some((c) => c.toLowerCase() === next.toLowerCase())) {
      setLastError("This coupon is already applied on this bill");
      return;
    }

    const status = validateCouponCodeAtPos({
      db: allRows,
      customer,
      lines: cart,
      orgId,
      locationId,
      paymentMethod: payment,
      otherDiscount: discount,
      membershipDiscount,
      staffId,
      code: next,
      alreadyAppliedCodes: appliedCodes,
      at: new Date(),
    });

    if (!status.ok) {
      setLastError(status.reason ?? "Coupon not valid for this bill");
      return void toast.error(status.reason ?? "Coupon not valid");
    }

    onChange([...appliedCodes, status.code]);
    setCode("");
    toast.success(`Coupon applied — ${money(status.amount)} off`);
  }

  if (!customer) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TicketPercent className="size-4 text-primary" />
          <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Coupon code</p>
        </div>
        {(appliedLines?.length ?? 0) > 0 ? (
          <span className="text-xs font-medium text-primary">
            −{money((appliedLines ?? []).reduce((s, l) => s + l.amount, 0))}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (lastError) setLastError("");
          }}
          placeholder="Enter coupon code"
          className="font-mono uppercase"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyCode(code);
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={() => applyCode(code)}>
          Apply
        </Button>
      </div>

      {lastError ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {lastError}
        </p>
      ) : null}

      {wallet.length > 0 ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Customer&apos;s issued coupons</Label>
          <div className="flex flex-wrap gap-2">
            {wallet.map((v) => {
              const c = String(v["code"]);
              const used = appliedCodes.some((x) => x.toLowerCase() === c.toLowerCase());
              return (
                <Button
                  key={String(v.id)}
                  type="button"
                  size="sm"
                  variant={used ? "secondary" : "outline"}
                  disabled={used}
                  onClick={() => applyCode(c)}
                >
                  {c}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {appliedCodes.length > 0 ? (
        <ul className="space-y-2">
          {appliedCodes.map((c) => {
            const quoted = lineByCode.get(c.toLowerCase());
            return (
              <li
                key={c}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/80 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="font-mono">{c}</Badge>
                    {quoted ? (
                      <span className="text-xs font-medium text-primary">−{money(quoted.amount)}</span>
                    ) : null}
                  </div>
                  {quoted?.title ? (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{quoted.title}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove coupon ${c}`}
                  onClick={() => onChange(appliedCodes.filter((x) => x !== c))}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Validated against location, validity, min bill, customer segment and stacking rules. Coupons are only redeemed
        after payment succeeds.
      </p>
    </div>
  );
}
