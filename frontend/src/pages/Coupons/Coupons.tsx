import { useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Eye, Gift, Pencil, Plus, Search, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CouponForm } from "@/components/CouponForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COUPONS_COLLECTION, emptyCoupon } from "@/lib/coupons/coupon-schema";
import {
  couponConditionsSummary,
  couponHeadline,
  describeCoupon,
  listCouponDefinitions,
  normalizeCoupon,
} from "@/lib/coupons/coupon-engine";
import { useListView } from "@/lib/list-view";
import { listLoyaltyCoupons, type LoyaltyCoupon, type LoyaltyCouponStatus } from "@/lib/rewards/loyalty-coupons";
import {
  couponPoolStats,
  discountTypeLabel,
  hasCodePoolConfigured,
  shouldGenerateCodePool,
  syncCouponCodePool,
} from "@/lib/coupons/coupon-code-pool";
import { issueVoucher } from "@/lib/vouchers/voucher-service";
import { useCollection, type Row } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";

const title = "Coupon management — Krios";
const description = "Create coupon schemes, generate code pools, and track redemptions at POS.";

export function CouponsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onCouponChild = /^\/coupons\/[^/]+(\/codes)?$/.test(pathname);
  if (onCouponChild) return <Outlet />;
  return <CouponsPage />;
}

const STATUS_FILTERS: Array<"All" | LoyaltyCouponStatus> = ["All", "Active", "Redeemed", "Expired"];

function statusVariant(status: LoyaltyCouponStatus) {
  if (status === "Redeemed") return "outline" as const;
  if (status === "Expired") return "destructive" as const;
  return "secondary" as const;
}

function CouponsPage() {
  const navigate = useNavigate();
  const { org, locationId } = useTenant();
  const { user } = useAuth();
  const { canEditHere } = usePermissions();
  const allowMutate = user?.role === "SUPER_ADMIN" || canEditHere;
  const { rows, create, update, remove } = useCollection(COUPONS_COLLECTION);
  const { rows: customers } = useCollection("customers");
  const { allRows, create: createRow } = useData();
  const { view } = useListView();

  const [tab, setTab] = useState("manage");
  const [query, setQuery] = useState("");
  const [issuedQuery, setIssuedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LoyaltyCouponStatus>("All");
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [issueSchemeId, setIssueSchemeId] = useState<string | null>(null);
  const [issueCustomerId, setIssueCustomerId] = useState("");

  const locName = (id: string) => org.locations.find((l) => l.locationId === id)?.name ?? id;

  const definitions = useMemo(
    () => listCouponDefinitions(allRows, { orgId: org.orgId, locationId }),
    [allRows, org.orgId, locationId],
  );

  const schemeDefs = useMemo(() => definitions.filter((c) => c.source === "coupons"), [definitions]);

  const filteredDefs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemeDefs;
    return schemeDefs.filter((c) =>
      [c.code, c.title, c.description, c.campaignTag, describeCoupon(c)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [schemeDefs, query]);

  const issued = useMemo(
    () => listLoyaltyCoupons(allRows, { orgId: org.orgId, locationId }),
    [allRows, org.orgId, locationId],
  );

  const filteredIssued = useMemo(() => {
    const q = issuedQuery.trim().toLowerCase();
    const outletName = (id: string) => org.locations.find((l) => l.locationId === id)?.name ?? id;
    return issued.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.code, c.customerName, c.title, c.detail, c.type, outletName(c.locationId)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [issued, issuedQuery, statusFilter, org.locations]);

  const stats = useMemo(
    () => ({
      definitions: filteredDefs.filter((c) => c.status === "Active").length,
      issued: issued.length,
      active: issued.filter((c) => c.status === "Active").length,
      redeemed: issued.filter((c) => c.status === "Redeemed").length,
    }),
    [filteredDefs, issued],
  );

  function openNew() {
    setIsNew(true);
    setEditing(
      emptyCoupon(
        org.orgId,
        locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId,
      ),
    );
  }

  function openEdit(row: Row) {
    setIsNew(false);
    setEditing({ ...row });
  }

  function save() {
    if (!editing) return;
    const code = String(editing["code"] ?? "").trim();
    if (!code) return void toast.error("Scheme reference code is required");
    if (!String(editing["title"] ?? "").trim()) {
      return void toast.error("Coupon name is required");
    }
    const id = String(editing.id);
    const qty = Math.max(0, Math.floor(Number(editing["couponQuantity"] ?? editing["totalUsageLimit"] ?? 0)));
    const payload = {
      ...editing,
      codePrefix: String(editing["codePrefix"] ?? code).trim() || code,
      couponQuantity: qty,
      totalUsageLimit: qty,
      usageLimitMode: qty > 0 && String(editing["autoGenerateCodes"] ?? "Yes") === "Yes" ? "limited_total" : editing["usageLimitMode"],
    };
    if (isNew) {
      create(payload);
    } else {
      update(id, payload);
    }

    if (shouldGenerateCodePool(payload)) {
      const pool = syncCouponCodePool({ db: allRows, create: createRow }, payload);
      if (pool.generated > 0) {
        toast.success(`Coupon saved · ${pool.generated} codes generated`, {
          description: `${pool.total} unique codes in pool`,
          action: {
            label: "View codes",
            onClick: () => navigate({ to: "/coupons/$couponId", params: { couponId: id } }),
          },
        });
      } else {
        toast.success(isNew ? "Coupon created" : "Coupon updated", {
          description: `${pool.total} codes in pool`,
        });
      }
    } else if (isNew) {
      toast.success("Coupon created", { description: code });
    } else {
      toast.success("Coupon updated", { description: code });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">Coupon management</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create coupon <strong>schemes</strong> with business rules, auto-generate unique redeem codes, and track
            used vs available codes at POS.
          </p>
        </div>
        {allowMutate && tab === "manage" ? (
          <Button size="sm" onClick={openNew}>
            <Plus /> New coupon scheme
          </Button>
        ) : null}
      </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon={TicketPercent} label="Active codes" value={String(stats.definitions)} />
          <StatCard icon={Gift} label="Issued total" value={String(stats.issued)} />
          <StatCard icon={Gift} label="Active issued" value={String(stats.active)} />
          <StatCard icon={TicketPercent} label="Redeemed" value={String(stats.redeemed)} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="manage">Coupon schemes</TabsTrigger>
            <TabsTrigger value="issued">Issued to customers</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search WELCOME20, festive…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coupon name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Unused</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[11rem]">Codes</TableHead>
                    {allowMutate ? <TableHead className="w-24" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDefs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={allowMutate ? 12 : 11} className="py-8 text-center text-sm text-muted-foreground">
                        No coupon schemes yet. Create a scheme with prefix, suffix, and quantity to auto-generate codes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDefs.map((c) => {
                      const pool = couponPoolStats(allRows, c.id, c);
                      const row = (allRows[COUPONS_COLLECTION] ?? []).find((r) => String(r.id) === c.id);
                      const poolReady = row ? hasCodePoolConfigured(row) : c.couponQuantity > 0 && c.autoGenerateCodes !== "No";
                      return (
                      <TableRow key={`${c.source}-${c.id}`}>
                        <TableCell>
                          <p className="font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                        </TableCell>
                        <TableCell className="text-sm">{discountTypeLabel(c.discountType)}</TableCell>
                        <TableCell className="text-sm">{describeCoupon(c)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{pool.total.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{pool.used.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{pool.unused.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{pool.expired.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{pool.remaining.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.validityStart || "—"} → {c.validityEnd || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {poolReady ? (
                            <Button variant="outline" size="sm" className="h-auto min-h-8 flex-col items-start gap-0.5 px-2 py-1.5" asChild>
                              <Link to="/coupons/$couponId" params={{ couponId: c.id }}>
                                <span className="flex items-center gap-1.5 text-xs font-medium">
                                  <Eye className="size-3.5" /> View coupon
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {pool.total.toLocaleString("en-IN")} total · {pool.used.toLocaleString("en-IN")} used ·{" "}
                                  {pool.remaining.toLocaleString("en-IN")} available
                                </span>
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Set quantity to generate</span>
                          )}
                        </TableCell>
                        {allowMutate ? (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                setIssueSchemeId(c.id);
                                setIssueCustomerId("");
                              }}
                            >
                              Issue
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const row = rows.find((r) => String(r.id) === c.id);
                                if (row) openEdit(row);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="issued" className="mt-4">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={issuedQuery}
                    onChange={(e) => setIssuedQuery(e.target.value)}
                    placeholder="Search customer, code…"
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
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {filteredIssued.length} of {issued.length} · {view === "card" ? "Card" : "Table"}
                </p>
              </div>

              {filteredIssued.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No issued coupons yet. They appear after QR check-in, wheel wins, or manual issue at POS.
                </p>
              ) : view === "card" ? (
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredIssued.map((c) => (
                    <IssuedCouponCard key={`${c.refCollection}-${c.id}`} coupon={c} outlet={locName(c.locationId)} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssued.map((c) => (
                        <TableRow key={`${c.refCollection}-${c.id}`}>
                          <TableCell className="font-mono text-xs">{c.code}</TableCell>
                          <TableCell>
                            <p className="font-medium">{c.customerName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{c.customerId}</p>
                          </TableCell>
                          <TableCell>{c.type}</TableCell>
                          <TableCell>
                            <p className="max-w-[14rem] truncate font-medium">{c.title}</p>
                            <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{c.detail}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{locName(c.locationId)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.issuedAt || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isNew ? "New coupon" : "Edit coupon"}</DialogTitle>
              <DialogDescription>
                Example: <strong>WELCOME20</strong> — 20% off services, min bill ₹500, new customers only, 1 per customer.
              </DialogDescription>
            </DialogHeader>
            {editing ? <CouponForm value={editing} onChange={setEditing} locations={org.locations} /> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>{isNew ? "Create coupon" : "Save changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(issueSchemeId)} onOpenChange={(open) => !open && setIssueSchemeId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Issue voucher</DialogTitle>
              <DialogDescription>
                Creates a unique redeemable code linked to this coupon scheme. Customer applies it at POS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-sm">Customer</Label>
              <Select value={issueCustomerId} onValueChange={setIssueCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter((c) => String(c["orgId"] ?? "") === org.orgId || !c["orgId"])
                    .map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {String(c["name"])} · {String(c["phone"] ?? c.id)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueSchemeId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!issueSchemeId || !issueCustomerId) return void toast.error("Select a customer");
                  const loc = locationId === "all" ? String(org.locations[0]?.locationId ?? "") : locationId;
                  const result = issueVoucher(
                    { db: allRows, create: createRow },
                    {
                      couponId: issueSchemeId,
                      customerId: issueCustomerId,
                      orgId: org.orgId,
                      locationId: loc,
                    },
                  );
                  if (!result.ok) return void toast.error(result.error);
                  toast.success("Voucher issued", { description: String(result.voucher?.["code"]) });
                  setIssueSchemeId(null);
                  setIssueCustomerId("");
                }}
              >
                Issue code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this coupon code?</AlertDialogTitle>
              <AlertDialogDescription>
                Existing issued coupons are kept. New check-ins will not receive this code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) {
                    remove(deleteId);
                    toast.success("Coupon deleted");
                    setDeleteId(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TicketPercent;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function IssuedCouponCard({ coupon, outlet }: { coupon: LoyaltyCoupon; outlet: string }) {
  return (
    <article className="rounded-xl border border-dashed border-primary/30 bg-gradient-to-br from-card to-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline">{coupon.type}</Badge>
        <Badge variant={statusVariant(coupon.status)}>{coupon.status}</Badge>
      </div>
      <p className="font-display mt-3 text-lg font-semibold">{coupon.title}</p>
      <p className="text-sm text-muted-foreground">{coupon.detail}</p>
      <p className="mt-4 font-mono text-sm tracking-wider">{coupon.code}</p>
      <div className="mt-4 space-y-1 text-sm">
        <p><span className="text-muted-foreground">Customer · </span>{coupon.customerName}</p>
        <p><span className="text-muted-foreground">Outlet · </span>{outlet}</p>
        <p className="text-xs text-muted-foreground">
          Issued {coupon.issuedAt || "—"}
          {coupon.redeemedAt ? ` · Redeemed ${coupon.redeemedAt}` : ""}
        </p>
      </div>
    </article>
  );
}
