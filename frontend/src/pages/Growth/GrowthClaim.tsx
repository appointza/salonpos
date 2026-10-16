import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Star, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth";
import { sameId } from "@/ids";
import { toRow } from "@/entity-row";
import { useData, type Row } from "@/store";
import { useTenant } from "@/tenant";
import { customersByPhoneInOrg, normalizePhone } from "@/pages/Customers/customer-lookup";
import { isValidPhone } from "@/pages/Customers/customer-store";
import { applyOrgLoyaltyChange, getOrgLoyaltyBalance } from "@/pages/Loyalty/loyalty-service";
import { customerService, mergePosLookupKeep } from "@/services/customer.service";
import { orgIsGrowthPackage, pointsFromStoreOffer } from "@/pages/Growth/growth-claim";
import { CUSTOMER_REWARDS } from "@/pages/Loyalty/rewards/customer-reward-service";

type EarnedOffer = {
  key: string;
  title: string;
  source: string;
  detail: string;
  status: "Pending" | "Redeemed" | "Expired";
  points: number;
  date: string;
  collection: string;
  row: Row;
};

function offerStatus(row: Row): EarnedOffer["status"] {
  const raw = String(row["status"] ?? "").trim();
  if (/^(redeemed|used|claimed|completed)$/i.test(raw)) return "Redeemed";
  const expires = String(row["expiresAt"] ?? "").slice(0, 10);
  const day = new Date().toISOString().slice(0, 10);
  if (expires && expires < day) return "Expired";
  if (/^expired$/i.test(raw) || /^cancelled$/i.test(raw)) return "Expired";
  return "Pending";
}

function fromRow(row: Row, source: string, title: string, collection: string, rupeesPerPoint: number): EarnedOffer {
  return {
    key: `${collection}-${String(row.id)}`,
    title,
    source,
    detail: [row["rewardType"], row["offerType"], row["valueLabel"], row["description"]]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 2)
      .join(" · "),
    status: offerStatus(row),
    points: pointsFromStoreOffer(row, rupeesPerPoint),
    date: String(row["redeemedAt"] ?? row["createdAt"] ?? row["spunAt"] ?? row["issuedAt"] ?? row["createdon"] ?? "").slice(
      0,
      10,
    ),
    collection,
    row,
  };
}

export function GrowthClaimPage() {
  const { user } = useAuth();
  const { orgId } = useTenant();
  const { allRows, applyCache, create, update } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const allowed = orgIsGrowthPackage(orgRow);
  const rupeesPerPoint = Number(orgRow?.["rupeesPerPoint"] ?? 1) || 1;

  const [phone, setPhone] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "missing">("idle");
  const [guests, setGuests] = useState<Row[]>([]);
  const [claimPts, setClaimPts] = useState("");
  const [saving, setSaving] = useState("");
  const lookupSeq = useRef(0);

  const digits = normalizePhone(phone);
  const ready = isValidPhone(phone);
  const guestIds = useMemo(() => new Set(guests.map((g) => String(g.id))), [guests]);
  const primary = guests[0] ?? null;
  const orgPoints = getOrgLoyaltyBalance(allRows, orgId, digits);

  const offers = useMemo(() => {
    if (guestIds.size === 0) return { pending: [] as EarnedOffer[], claimed: [] as EarnedOffer[] };
    const forGuest = (collection: string) =>
      (allRows[collection] ?? []).filter(
        (r) => guestIds.has(String(r["customerId"])) && (!r["orgId"] || sameId(r["orgId"], orgId)),
      );

    const items: EarnedOffer[] = [
      ...forGuest("wheelSpins").map((r) =>
        fromRow(r, "Prize wheel", String(r["label"] ?? "Wheel prize"), "wheelSpins", rupeesPerPoint),
      ),
      ...forGuest("scratchPlays").map((r) =>
        fromRow(r, "Scratch card", String(r["label"] ?? "Scratch prize"), "scratchPlays", rupeesPerPoint),
      ),
      ...forGuest(CUSTOMER_REWARDS).map((r) =>
        fromRow(
          r,
          String(r["sourceType"] ?? "Prize") === "stamp" ? "Stamp card" : "Guest prize",
          String(r["title"] ?? r["label"] ?? "Reward"),
          CUSTOMER_REWARDS,
          rupeesPerPoint,
        ),
      ),
      ...forGuest("qrOfferRedemptions").map((r) =>
        fromRow(r, "Offer", String(r["offerTitle"] ?? r["offerId"] ?? "Offer"), "qrOfferRedemptions", rupeesPerPoint),
      ),
      ...forGuest("partnerCoupons").map((r) =>
        fromRow(r, "Partner", String(r["offer"] ?? r["couponCode"] ?? "Partner coupon"), "partnerCoupons", rupeesPerPoint),
      ),
    ];

    const seen = new Set<string>();
    const unique = items.filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
    const pending = unique.filter((item) => item.status === "Pending").sort((a, b) => b.date.localeCompare(a.date));
    const claimed = unique
      .filter((item) => item.status === "Redeemed")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
    return { pending, claimed };
  }, [allRows, guestIds, orgId, rupeesPerPoint]);

  useEffect(() => {
    if (!allowed) return;
    if (!ready) {
      lookupSeq.current += 1;
      setGuests([]);
      setClaimPts("");
      setLookupStatus("idle");
      return;
    }

    const seq = ++lookupSeq.current;
    setLookupStatus("loading");
    setGuests([]);
    setClaimPts("");

    void (async () => {
      const profiles = new Map<string, Row>();
      try {
        const first = await customerService.lookupAtPos({
          orgId: Number(orgId),
          locationId: 0,
          phone: digits,
        });
        if (seq !== lookupSeq.current) return;
        if (first.customer) {
          applyCache((prev) => mergePosLookupKeep(prev, first));
          const row = toRow(first.customer as unknown as Record<string, unknown>);
          profiles.set(String(row.id), row);
        }
      } catch {
        /* local fallback */
      }
      if (seq !== lookupSeq.current) return;

      for (const row of customersByPhoneInOrg(allRows["customers"] ?? [], digits, String(orgId))) {
        if (!profiles.has(String(row.id))) profiles.set(String(row.id), row);
      }

      for (const profile of [...profiles.values()].slice(1)) {
        try {
          const res = await customerService.lookupAtPos({
            orgId: Number(orgId),
            locationId: 0,
            customerId: Number(profile.id) || 0,
            phone: digits,
          });
          if (seq !== lookupSeq.current) return;
          if (res.customer) {
            applyCache((prev) => mergePosLookupKeep(prev, res));
            const row = toRow(res.customer as unknown as Record<string, unknown>);
            profiles.set(String(row.id), row);
          }
        } catch {
          /* keep local row */
        }
      }
      if (seq !== lookupSeq.current) return;
      if (profiles.size === 0) {
        setGuests([]);
        setLookupStatus("missing");
        return;
      }
      setGuests([...profiles.values()]);
      setLookupStatus("found");
    })();
    // Lookup only when the mobile / org changes — not on every store refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, ready, digits, orgId]);

  async function applyPoints(mode: "claim" | "add") {
    if (!primary) return;
    const pts = Math.floor(Number(claimPts));
    if (!Number.isFinite(pts) || pts <= 0) return void toast.error("Enter points");
    setSaving(mode);
    try {
      const result = applyOrgLoyaltyChange(
        { db: allRows, create, update },
        {
          orgId,
          phone: digits,
          points: pts,
          mode,
          source: "GrowthClaim",
          referenceId: `growth-${mode}-${Date.now()}`,
          reason:
            mode === "claim"
              ? `Claimed −${pts} pts by ${user?.name ?? "staff"}`
              : `Added +${pts} pts by ${user?.name ?? "staff"}`,
          preferCustomerId: primary.id,
        },
      );
      if (!result.ok) {
        toast.error(result.error ?? "Could not update points");
        return;
      }
      setClaimPts("");
      toast.success(
        mode === "claim"
          ? `Claimed ${pts.toLocaleString("en-IN")} points`
          : `Added ${pts.toLocaleString("en-IN")} points`,
        { description: `Total now ${result.orgBalanceAfter.toLocaleString("en-IN")} pts` },
      );
    } finally {
      setSaving("");
    }
  }

  async function claimOffer(item: EarnedOffer) {
    if (!primary) return;
    setSaving(item.key);
    try {
      const alreadyBonus = /bonus point/i.test(String(item.row["rewardType"] ?? ""));
      if (item.points > 0 && !alreadyBonus) {
        const result = applyOrgLoyaltyChange(
          { db: allRows, create, update },
          {
            orgId,
            phone: digits,
            points: item.points,
            mode: "add",
            source: "GrowthClaim",
            referenceId: `growth-offer-${item.key}`,
            reason: `Claimed ${item.title} by ${user?.name ?? "staff"}`,
            preferCustomerId: primary.id,
          },
        );
        if (!result.ok) {
          toast.error(result.error ?? "Could not claim offer");
          return;
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      void update(item.collection, item.row.id, { ...item.row, status: "Redeemed", redeemedAt: today });
      toast.success(`Claimed ${item.title}`, {
        description:
          item.points > 0 && !alreadyBonus
            ? `+${item.points.toLocaleString("en-IN")} pts added`
            : "Offer marked claimed",
      });
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Claim points</h1>

      {!allowed ? (
        <p className="text-sm text-muted-foreground">This screen is for salons on the Growth package.</p>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Input
            id="growth-phone"
            inputMode="numeric"
            autoFocus
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Mobile number"
            className="h-12 text-base"
          />

          {lookupStatus === "loading" ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Fetching offers and points…
            </p>
          ) : null}

          {lookupStatus === "missing" ? (
            <p className="mt-4 text-sm text-destructive">No customer in this organisation for that number.</p>
          ) : null}

          {primary ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted-foreground">{String(primary["name"] || digits)}</p>
              <p className="flex items-center gap-2 text-lg font-semibold">
                <Star className="size-5 text-primary" />
                Total {orgPoints.toLocaleString("en-IN")} points
              </p>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 w-full flex-1 sm:min-w-[10rem]">
                  <Label htmlFor="growth-claim-pts" className="mb-1.5">
                    Points
                  </Label>
                  <Input
                    id="growth-claim-pts"
                    inputMode="numeric"
                    value={claimPts}
                    onChange={(e) => setClaimPts(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter points"
                    className="h-12 text-base"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full sm:w-auto"
                  disabled={!!saving}
                  onClick={() => void applyPoints("claim")}
                >
                  {saving === "claim" ? <Loader2 className="animate-spin" /> : <Minus />}
                  Claim
                </Button>
                <Button type="button" className="h-12 w-full sm:w-auto" disabled={!!saving} onClick={() => void applyPoints("add")}>
                  {saving === "add" ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add
                </Button>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <TicketPercent className="size-3.5 text-primary" />
                  Pending to claim
                </p>
                {offers.pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending offers to claim.</p>
                ) : (
                  <ul className="space-y-2">
                    {offers.pending.map((item) => (
                      <li
                        key={item.key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            {item.title}
                            <Badge>Pending</Badge>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.source}
                            {item.detail ? ` · ${item.detail}` : ""}
                            {item.points > 0 ? ` · ${item.points.toLocaleString("en-IN")} pts` : ""}
                            {item.date ? ` · ${item.date}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!!saving}
                          onClick={() => void claimOffer(item)}
                        >
                          {saving === item.key ? <Loader2 className="animate-spin" /> : null}
                          Claim
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {offers.claimed.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium">Last claimed</p>
                    <ul className="space-y-2">
                      {offers.claimed.map((item) => (
                        <li key={item.key} className="rounded-lg border border-border px-3 py-3">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            {item.title}
                            <Badge variant="secondary">Claimed</Badge>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.source}
                            {item.detail ? ` · ${item.detail}` : ""}
                            {item.date ? ` · ${item.date}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
