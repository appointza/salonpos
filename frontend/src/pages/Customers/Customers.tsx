import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/lib/permissions";
import { collapseCustomersByPhone, findCustomerByPhoneInOrg } from "@/lib/customers/customer-lookup";
import { getCustomerLoyaltyBalance } from "@/lib/loyalty/loyalty-service";
import { useCollection, useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

const title = "Customers — Luxe Salon CRM";
const description = "Manage salon customer profiles, households, loyalty tiers and wallet balances.";
const NONE = "__none__";
const PAGE_SIZE = 20;

export function CustomersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDetail = /^\/customers\/[^/]+$/.test(pathname);
  if (onDetail) return <Outlet />;
  return <CustomersListPage />;
}

type ListRow = Row & { membershipLabel: string; displayPoints: number };

const CustomerRow = memo(function CustomerRow({
  row,
  allowEdit,
  onView,
  onEdit,
  onDelete,
}: {
  row: ListRow;
  allowEdit: boolean;
  onView: (id: string) => void;
  onEdit: (row: Row) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => onView(String(row.id))}>
      <TableCell className="font-medium">
        <Link to="/customers/$customerId" params={{ customerId: String(row.id) }} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {String(row["name"] ?? "—")}
        </Link>
      </TableCell>
      <TableCell>{String(row["phone"] ?? "—")}</TableCell>
      <TableCell>
        <Badge variant="secondary">{String(row["tier"] ?? "—")}</Badge>
      </TableCell>
      <TableCell>{Number(row.displayPoints ?? row["points"] ?? 0).toLocaleString("en-IN")}</TableCell>
      <TableCell>₹{Number(row["walletBalance"] ?? 0).toLocaleString("en-IN")}</TableCell>
      <TableCell>{row.membershipLabel}</TableCell>
      <TableCell>{String(row["outlet"] ?? "—")}</TableCell>
      <TableCell>{String(row["lastVisit"] ?? "—")}</TableCell>
      <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" aria-label={`View ${String(row.id)}`} asChild>
          <Link to="/customers/$customerId" params={{ customerId: String(row.id) }}>
            <Eye className="size-4" />
          </Link>
        </Button>
        {allowEdit ? (
          <>
            <Button variant="ghost" size="icon" aria-label={`Edit ${String(row.id)}`} onClick={() => onEdit(row)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${String(row.id)}`} onClick={() => onDelete(String(row.id))}>
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}
      </TableCell>
    </TableRow>
  );
});

function CustomersListPage() {
  const navigate = useNavigate();
  const { rows, create, update, remove } = useCollection("customers");
  const { rows: franchiseRows } = useCollection("franchises");
  const { db, allRows, orgId } = useData();
  const { org, location, locationId, scopeLabel } = useTenant();
  const { user } = useAuth();
  const { canEditHere } = usePermissions();
  const allowEdit = user?.role === "SUPER_ADMIN" || canEditHere;
  const lockOutlet = user?.role === "STYLIST" && Boolean(user.locationId || location?.locationId);

  const outlets = useMemo(() => {
    if (franchiseRows.length > 0) {
      return franchiseRows.map((o) => ({
        name: String(o["name"] ?? ""),
        locationId: String(o["locationId"] ?? ""),
      }));
    }
    return org.locations.map((l) => ({
      name: l.name,
      locationId: String(l.locationId),
    }));
  }, [franchiseRows, org.locations]);

  const defaultOutlet = useMemo(() => {
    if (locationId !== "all") {
      return outlets.find((o) => o.locationId === String(locationId)) ?? outlets[0];
    }
    return outlets[0];
  }, [outlets, locationId]);

  const applyOutlet = useCallback(
    (row: Row, outletName: string): Row => {
      const match = outlets.find((o) => o.name === outletName);
      return {
        ...row,
        outlet: outletName,
        locationId: match?.locationId ?? row["locationId"] ?? defaultOutlet?.locationId ?? "",
      };
    },
    [outlets, defaultOutlet],
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, locationId]);

  const memberships = useMemo(
    () => (allRows["memberships"] ?? []).filter((m) => String(m["orgId"]) === orgId),
    [allRows, orgId],
  );
  const plans = useMemo(
    () => (allRows["membershipPlans"] ?? []).filter((p) => String(p["orgId"]) === orgId),
    [allRows, orgId],
  );

  const membershipMap = useMemo(() => {
    const map = new Map<string, Row>();
    for (const m of memberships) map.set(String(m.id), m);
    return map;
  }, [memberships]);

  const planMap = useMemo(() => {
    const map = new Map<string, Row>();
    for (const p of plans) {
      map.set(String(p.id), p);
      map.set(String(p["name"]), p);
    }
    return map;
  }, [plans]);

  const uniqueRows = useMemo(() => collapseCustomersByPhone(rows), [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return uniqueRows;
    return uniqueRows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  }, [uniqueRows, debouncedQuery]);

  const enhancedRows = useMemo<ListRow[]>(() => {
    return filtered.map((row) => {
      const mem = membershipMap.get(String(row["membershipId"] ?? ""));
      const plan = mem
        ? (planMap.get(String(mem["planId"] ?? "")) ?? planMap.get(String(mem["plan"] ?? "")))
        : undefined;
      return {
        ...row,
        membershipLabel: plan ? String(plan["name"]) : mem ? String(mem["plan"] ?? mem.id) : "—",
        displayPoints: getCustomerLoyaltyBalance(allRows, String(row.id)),
      };
    });
  }, [filtered, membershipMap, planMap, allRows]);

  const totalPages = Math.max(1, Math.ceil(enhancedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(
    () => enhancedRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [enhancedRows, safePage],
  );

  const editingData = useMemo(() => {
    if (!editing) return null;
    const membership = membershipMap.get(String(editing["membershipId"] ?? ""));
    const plan = membership
      ? (planMap.get(String(membership["planId"] ?? "")) ?? planMap.get(String(membership["plan"] ?? "")))
      : undefined;
    const cid = String(editing.id);
    return {
      membership,
      plan,
      options: memberships.filter((m) => {
        const owner = String(m["customerId"] ?? "");
        return !owner || owner === cid || String(m.id) === String(editing["membershipId"] ?? "");
      }),
      invoices: (allRows["invoices"] ?? []).filter((i) => String(i["customerId"]) === cid).slice(0, 5),
      txs: (allRows["loyaltyTransactions"] ?? []).filter((t) => String(t["customerId"]) === cid).slice(0, 6),
      products: (allRows["stockMovements"] ?? []).filter((m) => {
        const type = String(m["type"]);
        return String(m["customerId"]) === cid && (type === "Sale" || type === "Used");
      }),
    };
  }, [editing, membershipMap, planMap, memberships, allRows]);

  const onView = useCallback(
    (id: string) => {
      void navigate({ to: "/customers/$customerId", params: { customerId: id } });
    },
    [navigate],
  );

  const onEdit = useCallback((row: Row) => {
    setIsNew(false);
    setEditing({ ...row });
  }, []);

  const onDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Customers</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            One phone number is one customer. A return visit records the service on that profile — it does not create another customer.
            Loyalty, wallet and visits stay on the same profile. Buy stock on{" "}
            <Link to="/expenses" className="text-primary hover:underline">
              Expenses
            </Link>
            , remaining on{" "}
            <Link to="/inventory" className="text-primary hover:underline">
              Inventory
            </Link>
            , sell or use on{" "}
            <Link to="/pos" className="text-primary hover:underline">
              POS
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-normal">
              Org · {org.name}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              Outlet · {scopeLabel}
            </Badge>
          </div>
        </div>
        {allowEdit ? (
          <Button
            size="sm"
            onClick={() => {
              setIsNew(true);
              setEditing({
                id: 0,
                name: "",
                phone: "",
                email: "",
                gender: "Female",
                birthday: "",
                anniversary: "",
                household: "",
                tier: "Silver",
                points: 0,
                walletBalance: 0,
                membershipId: 0,
                outlet: defaultOutlet?.name ?? "",
                lastVisit: "",
                notes: "",
                locationId: defaultOutlet?.locationId ?? (locationId === "all" ? 0 : Number(locationId) || 0),
              });
            }}
          >
            <Plus /> New customer
          </Button>
        ) : null}
      </header>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className="pl-9" />
          </div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {enhancedRows.length} of {rows.length} · page {safePage + 1} / {totalPages}
          </p>
        </div>

        {enhancedRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => (
                  <CustomerRow key={String(row.id)} row={row} allowEdit={allowEdit} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {enhancedRows.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, enhancedRows.length)} of {enhancedRows.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "New customer" : "Edit customer"}</DialogTitle>
            <DialogDescription>Record ID {editing ? String(editing.id) : ""}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5">Organisation</Label>
                <Input value={org.name} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="mb-1.5">Full name</Label>
                <Input value={String(editing["name"] ?? "")} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Phone</Label>
                <Input value={String(editing["phone"] ?? "")} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Email</Label>
                <Input value={String(editing["email"] ?? "")} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Gender</Label>
                <Select value={String(editing["gender"] ?? "")} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Birthday</Label>
                <Input type="date" value={String(editing["birthday"] ?? "")} onChange={(e) => setEditing({ ...editing, birthday: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Anniversary</Label>
                <Input type="date" value={String(editing["anniversary"] ?? "")} onChange={(e) => setEditing({ ...editing, anniversary: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Household / family</Label>
                <Input value={String(editing["household"] ?? "")} onChange={(e) => setEditing({ ...editing, household: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Tier</Label>
                <Select value={String(editing["tier"] ?? "")} onValueChange={(v) => setEditing({ ...editing, tier: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Wallet balance</Label>
                <Input
                  type="number"
                  value={String(editing["walletBalance"] ?? 0)}
                  onChange={(e) => setEditing({ ...editing, walletBalance: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="mb-1.5">Outlet</Label>
                {lockOutlet ? (
                  <Input
                    readOnly
                    className="bg-muted"
                    value={
                      outlets.find((o) => o.locationId === String(editing["locationId"] ?? ""))?.name ??
                      String(editing["outlet"] ?? location?.name ?? "—")
                    }
                  />
                ) : outlets.length > 0 ? (
                  <Select
                    value={String(editing["outlet"] ?? "")}
                    onValueChange={(v) => setEditing(applyOutlet(editing, v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select outlet…" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.locationId + o.name} value={o.name}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    readOnly
                    className="bg-muted"
                    value="No outlets — add one under Outlets first"
                  />
                )}
              </div>
              <div>
                <Label className="mb-1.5">Last visit</Label>
                <Input type="date" value={String(editing["lastVisit"] ?? "")} onChange={(e) => setEditing({ ...editing, lastVisit: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Membership</Label>
                <Select
                  value={String(editing["membershipId"] ?? "") || NONE}
                  onValueChange={(v) => setEditing({ ...editing, membershipId: v === NONE ? "" : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No membership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No membership</SelectItem>
                    {(editingData?.options ?? []).map((m) => {
                      const optionPlan = planMap.get(String(m["planId"] ?? "")) ?? planMap.get(String(m["plan"] ?? ""));
                      return (
                        <SelectItem key={String(m.id)} value={String(m.id)}>
                          {String(optionPlan?.["name"] ?? m["plan"] ?? m.id)} · {String(m.id)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {editingData?.membership ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {String(editingData.plan?.["name"] ?? editingData.membership["plan"] ?? "")} · {String(editingData.membership["status"])} ·{" "}
                    {String(editingData.membership["startDate"] ?? "")} → {String(editingData.membership["endDate"] ?? "")}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5">Notes</Label>
                <Textarea value={String(editing["notes"] ?? "")} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm sm:col-span-2">
                <p className="font-medium">Balances (updated by POS)</p>
                <p className="mt-1 text-muted-foreground">
                  Loyalty {getCustomerLoyaltyBalance(allRows, String(editing.id)).toLocaleString("en-IN")} pts · wallet ₹
                  {Number(editing["walletBalance"] ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
              {editingData && editingData.invoices.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium">Recent invoices</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {editingData.invoices.map((inv) => (
                      <li key={String(inv.id)}>
                        {String(inv.id)} · {String(inv["date"])} · ₹{Number(inv["total"] ?? 0).toLocaleString("en-IN")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {editingData && editingData.txs.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium">Loyalty ledger</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {editingData.txs.map((t) => (
                      <li key={String(t.id)}>
                        {String(t["type"])} {Number(t["points"] ?? 0)} pts · {String(t["invoiceId"] ?? "")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {editingData && editingData.products.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-sm font-medium">Products used / sold</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {editingData.products.map((p) => (
                      <li key={String(p.id)}>
                        {String(p["skuName"] ?? p["skuId"] ?? p.id)} · {String(p["type"])} · {String(p["quantity"] ?? p["qtyOut"] ?? "")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void (async () => {
                  if (!editing) return;
                  if (!String(editing["name"] ?? "").trim()) return void toast.error("Enter a name");
                  const outletName = String(editing["outlet"] ?? defaultOutlet?.name ?? "").trim();
                  if (!outletName) return void toast.error("Select an outlet first");
                  const payload = applyOutlet({ ...editing, membershipId: editing["membershipId"] || 0 }, outletName);
                  if (!Number(payload["locationId"])) {
                    return void toast.error("Outlet has no location — check Outlets page");
                  }
                  if (isNew && String(payload["phone"] ?? "").trim()) {
                    const existing = findCustomerByPhoneInOrg(
                      allRows["customers"] ?? [],
                      String(payload["phone"]),
                      orgId,
                    );
                    if (existing) {
                      return void toast.error("This phone already has a customer. Bill the service on that profile.");
                    }
                  }
                  try {
                    if (isNew) {
                      await create(payload);
                      toast.success("Customer created");
                    } else {
                      await update(String(editing.id), payload);
                      toast.success("Customer updated", { description: String(editing.id) });
                    }
                    setEditing(null);
                  } catch {
                    /* store shows error toast */
                  }
                })();
              }}
            >
              {isNew ? "Create customer" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>{deleteId} will be removed from the demo dataset.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  remove(deleteId);
                  toast.success("Customer deleted", { description: deleteId });
                }
                setDeleteId(null);
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
