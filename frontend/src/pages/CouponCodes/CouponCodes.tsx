import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Barcode, Download, Printer, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUPONS_COLLECTION } from "@/lib/coupons/coupon-schema";
import {
  type CouponCodeStatus,
  couponPoolStats,
  hasCodePoolConfigured,
  listCouponPoolCodes,
  previewPoolCodes,
  shouldGenerateCodePool,
  syncCouponCodePool,
} from "@/lib/coupons/coupon-code-pool";
import { downloadCouponBarcodeSheet, printCouponBarcodes } from "@/lib/coupons/export-coupon-barcodes";
import { downloadCouponCodesExcel, printCouponCodes } from "@/lib/coupons/export-coupon-codes";
import { couponHeadline, normalizeCoupon } from "@/lib/coupons/coupon-engine";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/lib/tenant";
import { usePermissions } from "@/lib/permissions";
import { toast } from "sonner";

const title = "Coupon codes — Krios";
const STATUS_FILTERS: Array<"All" | CouponCodeStatus> = [
  "All",
  "Available",
  "Issued",
  "Used",
  "Expired",
  "Cancelled",
];

function statusVariant(status: CouponCodeStatus) {
  if (status === "Used") return "outline" as const;
  if (status === "Expired" || status === "Cancelled") return "destructive" as const;
  if (status === "Issued") return "secondary" as const;
  return "default" as const;
}

export function CouponCodesPage() {
  const { couponId } = useParams({ from: "/_app/coupons/$couponId/codes" });
  const { org } = useTenant();
  const { user } = useAuth();
  const { canEditHere } = usePermissions();
  const allowMutate = user?.role === "SUPER_ADMIN" || canEditHere;
  const { allRows, create } = useApi();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CouponCodeStatus>("All");

  const couponRow = useMemo(
    () => (allRows[COUPONS_COLLECTION] ?? []).find((c) => String(c.id) === couponId),
    [allRows, couponId],
  );

  const coupon = couponRow ? normalizeCoupon(couponRow, "coupons") : null;

  const codes = useMemo(
    () => listCouponPoolCodes(allRows, couponId, coupon ?? undefined, org.locations),
    [allRows, couponId, coupon, org.locations],
  );

  const stats = useMemo(
    () => couponPoolStats(allRows, couponId, coupon ?? undefined),
    [allRows, couponId, coupon],
  );

  const filtered = useMemo(() => {
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

  if (!coupon || !couponRow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/coupons"><ArrowLeft className="size-4" /> Back to coupon management</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Coupon scheme not found.</p>
      </div>
    );
  }

  function regenerateMissing() {
    if (!allowMutate) return;
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
    if (!source.length) {
      toast.error("No codes to export");
      return;
    }
    downloadCouponCodesExcel(source, coupon, org.name, scope);
    toast.success("Download started", { description: "Open the CSV file in Excel to print and distribute" });
  }

  function printList() {
    const available = codes.filter((c) => c.status === "Available");
    if (!available.length) {
      toast.error("No available codes to print");
      return;
    }
    const ok = printCouponCodes(available, coupon, org.name);
    if (!ok) toast.error("Allow pop-ups to print coupon codes");
  }

  function barcodeSource() {
    const base = statusFilter === "All" ? codes : filtered;
    return base.filter((c) => c.status === "Available" || c.status === "Issued");
  }

  function printBarcodes() {
    const source = barcodeSource();
    if (!source.length) {
      toast.error("No codes available for barcodes");
      return;
    }
    const ok = printCouponBarcodes(source, coupon, org.name);
    if (!ok) toast.error("Allow pop-ups to generate barcodes");
    else toast.success(`Barcode sheet ready`, { description: `${source.length} labels` });
  }

  function downloadBarcodes() {
    const source = barcodeSource();
    if (!source.length) {
      toast.error("No codes available for barcodes");
      return;
    }
    if (!downloadCouponBarcodeSheet(source, coupon, org.name)) {
      toast.error("Could not download barcode sheet");
      return;
    }
    toast.success("Barcode sheet downloaded", { description: "Open the HTML file and print labels" });
  }

  const samples = previewPoolCodes(couponRow, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to="/coupons/$couponId" params={{ couponId }}><ArrowLeft className="size-4" /> Coupon overview</Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl tracking-tight">{coupon.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{coupon.description || couponHeadline(coupon)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Format: <span className="font-mono text-foreground">{samples.join(" · ") || "—"}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowMutate && shouldGenerateCodePool(couponRow) ? (
            <Button variant="outline" size="sm" onClick={regenerateMissing}>
              Generate codes
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => exportExcel("available")} disabled={stats.available === 0}>
            <Download className="size-4" />
            Excel (available)
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel("all")} disabled={codes.length === 0}>
            <Download className="size-4" />
            Excel (all)
          </Button>
          <Button size="sm" onClick={printList} disabled={stats.available === 0}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button size="sm" variant="secondary" onClick={printBarcodes} disabled={stats.available === 0 && stats.issued === 0}>
            <Barcode className="size-4" />
            Print barcodes
          </Button>
          <Button size="sm" variant="outline" onClick={downloadBarcodes} disabled={stats.available === 0 && stats.issued === 0}>
            <Barcode className="size-4" />
            Download barcodes
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={stats.total} />
        <Stat label="Used" value={stats.used} />
        <Stat label="Unused" value={stats.unused} />
        <Stat label="Available" value={stats.available} />
        <Stat label="Expired" value={stats.expired} />
        <Stat label="Remaining" value={stats.remaining} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
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
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm font-semibold tracking-wide">{row.code}</TableCell>
                    <TableCell>
                      <p className="text-sm">{row.customerName}</p>
                      {row.customerPhone ? (
                        <p className="text-xs text-muted-foreground">{row.customerPhone}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.issuedAt || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.redeemedAt || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.invoiceId || "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {row.discountAmount > 0 ? `₹${row.discountAmount.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.locationName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}
