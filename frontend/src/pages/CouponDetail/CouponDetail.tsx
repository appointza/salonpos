import { useMemo, useState, type ReactNode } from "react";
import { Link, Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Barcode, Download, Lock, Pencil, Printer, Search, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { CouponForm } from "@/components/CouponForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COUPONS_COLLECTION } from "@/lib/coupons/coupon-schema";
import {
  couponConditionsSummary,
  couponHeadline,
  describeCoupon,
  normalizeCoupon,
} from "@/lib/coupons/coupon-engine";
import {
  type CouponCodeStatus,
  couponPoolStats,
  discountTypeLabel,
  hasCodePoolConfigured,
  listCouponPoolCodes,
  previewPoolCodes,
  shouldGenerateCodePool,
  syncCouponCodePool,
} from "@/lib/coupons/coupon-code-pool";
import { printCouponBarcodes } from "@/lib/coupons/export-coupon-barcodes";
import { downloadCouponCodesExcel, printCouponCodes } from "@/lib/coupons/export-coupon-codes";
import { useApi, useCollection, type Row } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/lib/tenant";
import { usePermissions } from "@/lib/permissions";

const STATUS_FILTERS: Array<"All" | CouponCodeStatus> = [
  "All",
  "Available",
  "Issued",
  "Used",
  "Expired",
  "Cancelled",
];

function codeStatusVariant(status: CouponCodeStatus) {
  if (status === "Used") return "outline" as const;
  if (status === "Expired" || status === "Cancelled") return "destructive" as const;
  if (status === "Issued") return "secondary" as const;
  return "default" as const;
}

export function CouponSchemeLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onCodes = /\/codes$/.test(pathname);
  if (onCodes) return <Outlet />;
  return <CouponDetailPage />;
}

function CouponDetailPage() {
  const { couponId } = useParams({ from: "/_app/coupons/$couponId" });
  const { org } = useTenant();
  const { user } = useAuth();
  const { canEditHere } = usePermissions();
  const allowMutate = user?.role === "SUPER_ADMIN" || canEditHere;
  const { allRows, create: createRow, create } = useApi();
  const { update } = useCollection(COUPONS_COLLECTION);

  const [editing, setEditing] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CouponCodeStatus>("All");

  const couponRow = useMemo(
    () => (allRows[COUPONS_COLLECTION] ?? []).find((c) => String(c.id) === couponId),
    [allRows, couponId],
  );

  const coupon = couponRow ? normalizeCoupon(couponRow, "coupons") : null;

  const stats = useMemo(
    () => (coupon ? couponPoolStats(allRows, couponId, coupon) : null),
    [allRows, couponId, coupon],
  );

  const codes = useMemo(
    () => (coupon ? listCouponPoolCodes(allRows, couponId, coupon, org.locations) : []),
    [allRows, couponId, coupon, org.locations],
  );

  const filteredCodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.code, c.customerName, c.customerPhone, c.invoiceId, c.locationName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [codes, query, statusFilter]);

  const locName = (id: string) => org.locations.find((l) => l.locationId === id)?.name ?? id;

  const eligibleOutlets = useMemo(() => {
    if (!coupon?.eligibleLocationIds) return org.locations.map((l) => l.name);
    const ids = coupon.eligibleLocationIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return org.locations.map((l) => l.name);
    return ids.map(locName);
  }, [coupon, org.locations]);

  if (!coupon || !couponRow || !stats) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/coupons"><ArrowLeft className="size-4" /> Coupon management</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Coupon scheme not found.</p>
      </div>
    );
  }

  const canEdit = allowMutate && stats.used === 0;
  const samples = previewPoolCodes(couponRow, 3);
  const hasPool = shouldGenerateCodePool(couponRow);

  function save() {
    if (!editing || !canEdit) return;
    const code = String(editing["code"] ?? "").trim();
    if (!code) return void toast.error("Scheme reference code is required");
    if (!String(editing["title"] ?? "").trim()) return void toast.error("Coupon name is required");

    const qty = Math.max(0, Math.floor(Number(editing["couponQuantity"] ?? editing["totalUsageLimit"] ?? 0)));
    const payload = {
      ...editing,
      codePrefix: String(editing["codePrefix"] ?? code).trim() || code,
      couponQuantity: qty,
      totalUsageLimit: qty,
      usageLimitMode: qty > 0 && String(editing["autoGenerateCodes"] ?? "Yes") === "Yes" ? "limited_total" : editing["usageLimitMode"],
    };

    update(String(editing.id), payload);

    if (shouldGenerateCodePool(payload)) {
      const pool = syncCouponCodePool({ db: allRows, create: createRow }, payload);
      toast.success("Coupon updated", {
        description: pool.generated > 0 ? `${pool.generated} new codes generated · ${pool.total} total` : `${pool.total} codes in pool`,
      });
    } else {
      toast.success("Coupon updated");
    }
    setEditing(null);
  }

  function regenerateMissing() {
    if (!allowMutate || !couponRow) return;
    const result = syncCouponCodePool({ db: allRows, create }, couponRow);
    if (result.generated > 0) {
      toast.success(`Generated ${result.generated} new codes`, { description: `${result.total} total in pool` });
    } else {
      toast.message("Code pool is up to date", { description: `${result.total} codes` });
    }
  }

  function exportExcel(scope: "all" | "available" | "used" = "all") {
    const source =
      scope === "available"
        ? codes.filter((c) => c.status === "Available")
        : scope === "used"
          ? codes.filter((c) => c.status === "Used")
          : codes;
    if (!source.length) return void toast.error("No codes to export");
    downloadCouponCodesExcel(source, coupon, org.name, scope);
    toast.success("Download started");
  }

  function printList() {
    const available = codes.filter((c) => c.status === "Available");
    if (!available.length) return void toast.error("No available codes to print");
    if (!printCouponCodes(available, coupon, org.name)) toast.error("Allow pop-ups to print coupon codes");
  }

  function barcodeSource() {
    const base = statusFilter === "All" ? codes : filteredCodes;
    return base.filter((c) => c.status === "Available" || c.status === "Issued");
  }

  function printBarcodes() {
    const source = barcodeSource();
    if (!source.length) return void toast.error("No codes available for barcodes");
    if (!printCouponBarcodes(source, coupon, org.name)) toast.error("Allow pop-ups to generate barcodes");
    else toast.success("Barcode sheet ready", { description: `${source.length} labels` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to="/coupons"><ArrowLeft className="size-4" /> Coupon management</Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight">{coupon.title}</h1>
              <Badge variant={coupon.status === "Active" ? "default" : "secondary"}>{coupon.status}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{coupon.id}</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {coupon.description || couponHeadline(coupon)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditing({ ...couponRow })}>
              <Pencil className="size-4" />
              Edit scheme
            </Button>
          ) : stats.used > 0 ? (
            <Button variant="outline" size="sm" disabled title="Cannot edit after codes are used">
              <Lock className="size-4" />
              Locked (used)
            </Button>
          ) : null}
        </div>
      </div>

      {stats.used > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <strong>{stats.used.toLocaleString("en-IN")} code{stats.used === 1 ? "" : "s"} redeemed.</strong> Scheme rules are locked while used codes exist. You can still view and export remaining codes.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TicketPercent} label="Total codes" value={stats.total} />
        <StatCard label="Available" value={stats.available} hint="Ready to distribute" />
        <StatCard label="Used" value={stats.used} hint="Redeemed at POS" />
        <StatCard label="Remaining" value={stats.remaining} hint="Unused & available" />
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Issued" value={stats.issued} />
        <MiniStat label="Unused" value={stats.unused} />
        <MiniStat label="Expired" value={stats.expired} />
        <MiniStat label="Cancelled" value={stats.cancelled} />
        <MiniStat label="Quantity set" value={coupon.couponQuantity || coupon.totalUsageLimit} />
        <MiniStat label="Usage count" value={coupon.usageCount} />
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Coupon codes</h2>
            <p className="text-xs text-muted-foreground">
              {filteredCodes.length.toLocaleString("en-IN")} of {codes.length.toLocaleString("en-IN")} shown
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowMutate && shouldGenerateCodePool(couponRow) ? (
              <Button variant="outline" size="sm" onClick={regenerateMissing}>
                Generate codes
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => exportExcel("available")} disabled={stats.available === 0}>
              <Download className="size-4" />
              Excel
            </Button>
            <Button size="sm" variant="outline" onClick={printList} disabled={stats.available === 0}>
              <Printer className="size-4" />
              Print
            </Button>
            <Button size="sm" variant="secondary" onClick={printBarcodes} disabled={stats.available === 0 && stats.issued === 0}>
              <Barcode className="size-4" />
              Barcodes
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, customer, mobile, bill…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "ghost"}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {codes.length === 0 ? (
          <div className="space-y-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {hasCodePoolConfigured(couponRow)
                ? `No codes generated yet. Click Generate to create ${coupon.couponQuantity || coupon.totalUsageLimit} unique codes.`
                : "Configure prefix, suffix, and coupon quantity on the scheme, then save to auto-generate codes."}
            </p>
            {allowMutate && shouldGenerateCodePool(couponRow) ? (
              <Button onClick={regenerateMissing}>
                Generate {(coupon.couponQuantity || coupon.totalUsageLimit).toLocaleString("en-IN")} codes
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued date</TableHead>
                  <TableHead>Used date</TableHead>
                  <TableHead>Bill number</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No codes match your search or filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm font-semibold tracking-wide">{row.code}</TableCell>
                      <TableCell>
                        <p className="text-sm">{row.customerName}</p>
                        {row.customerPhone ? (
                          <p className="text-xs text-muted-foreground">{row.customerPhone}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={codeStatusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.issuedAt || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.redeemedAt || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.invoiceId || "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {row.discountAmount > 0 ? `₹${row.discountAmount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.locationName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Discount & rules">
          <DetailRow label="Type" value={discountTypeLabel(coupon.discountType)} />
          <DetailRow label="Discount" value={describeCoupon(coupon)} />
          <DetailRow label="Conditions" value={couponConditionsSummary(coupon)} />
          <DetailRow label="Applies to" value={coupon.appliesTo.replace(/_/g, " ")} />
          {coupon.targetNames ? <DetailRow label="Targets" value={coupon.targetNames} /> : null}
          <DetailRow label="Payment" value={coupon.paymentMethod} />
          <DetailRow
            label="Stacking"
            value={`Other discounts: ${coupon.allowWithOtherDiscounts === "Yes" ? "Yes" : "No"} · Loyalty: ${coupon.allowWithLoyalty === "Yes" ? "Yes" : "No"}`}
          />
        </DetailCard>

        <DetailCard title="Validity & outlets">
          <DetailRow label="Valid from" value={coupon.validityStart || "—"} />
          <DetailRow label="Valid until" value={coupon.validityEnd || "—"} />
          <DetailRow label="Valid days" value={coupon.validDays === "all" ? "All days" : coupon.validDays} />
          {coupon.validTimeStart && coupon.validTimeEnd ? (
            <DetailRow label="Time window" value={`${coupon.validTimeStart} – ${coupon.validTimeEnd}`} />
          ) : null}
          <DetailRow label="Customer segment" value={coupon.customerSegment.replace(/_/g, " ")} />
          <DetailRow label="Outlets" value={eligibleOutlets.join(", ")} />
          {coupon.campaignTag ? <DetailRow label="Campaign" value={coupon.campaignTag} /> : null}
        </DetailCard>

        <DetailCard title="Code pool configuration" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailRow label="Prefix" value={coupon.codePrefix || coupon.code} mono />
            <DetailRow label="Suffix" value={coupon.codeSuffix || "—"} mono />
            <DetailRow label="Start number" value={String(coupon.codeStartNumber)} />
            <DetailRow label="Number length" value={String(coupon.codeLength)} />
          </div>
          <DetailRow
            label="Sample format"
            value={samples.join(" · ") || "—"}
            mono
          />
          <DetailRow
            label="Auto-generate"
            value={coupon.autoGenerateCodes === "Yes" ? `Yes · ${stats.total.toLocaleString("en-IN")} unique codes` : "No"}
          />
          {!hasPool ? (
            <p className="text-sm text-muted-foreground">
              Set coupon quantity and save to auto-generate unique redeem codes.
            </p>
          ) : null}
        </DetailCard>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit coupon scheme</DialogTitle>
            <DialogDescription>
              Update rules and code configuration. Editing is disabled once any code has been redeemed.
            </DialogDescription>
          </DialogHeader>
          {editing ? <CouponForm value={editing} onChange={setEditing} locations={org.locations} /> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: typeof TicketPercent;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {Icon ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-xs tracking-wide uppercase">{label}</span>
        </div>
      ) : (
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      )}
      <p className="font-display mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-medium tabular-nums">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function DetailCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className ?? ""}`}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
