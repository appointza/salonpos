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
import { useTenant } from "@/tenant";
import { CustomerRes } from "@/model/customers";
import { MembershipRes } from "@/model/memberships";
import { MembershipPlanRes } from "@/model/membershipPlans";
import { CustomerService } from "@/services/customer.service";
import { MembershipService } from "@/services/membership.service";
import { MembershipPlanService } from "@/services/membershipPlan.service";

const NONE = "__none__";
const PAGE_SIZE = 20;
const customerService = new CustomerService();
const membershipService = new MembershipService();
const membershipPlanService = new MembershipPlanService();

export function CustomersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDetail = /^\/customers\/[^/]+$/.test(pathname);
  if (onDetail) return <Outlet />;
  return <CustomersListPage />;
}

function dateInput(value: string | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function apiDate(value: string | undefined): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return s.slice(0, 10);
}

function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 10 ? digits : digits.slice(-10);
}

function emptyCustomer(orgId: number, locationId: number, outlet: string): CustomerRes {
  const row = new CustomerRes();
  row.orgId = orgId;
  row.locationId = locationId;
  row.outlet = outlet;
  row.gender = "Female";
  row.tier = "Silver";
  return row;
}

type ListRow = CustomerRes & { membershipLabel: string };

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
  onEdit: (row: CustomerRes) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => onView(String(row.id))}>
      <TableCell className="font-medium">
        <Link to="/customers/$customerId" params={{ customerId: String(row.id) }} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.name || "—"}
        </Link>
      </TableCell>
      <TableCell>{row.phone || "—"}</TableCell>
      <TableCell>
        <Badge variant="secondary">{row.tier || "—"}</Badge>
      </TableCell>
      <TableCell>{Number(row.points ?? 0).toLocaleString("en-IN")}</TableCell>
      <TableCell>₹{Number(row.walletBalance ?? 0).toLocaleString("en-IN")}</TableCell>
      <TableCell>{row.membershipLabel}</TableCell>
      <TableCell>{row.outlet || "—"}</TableCell>
      <TableCell>{dateInput(row.lastVisit) || "—"}</TableCell>
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
  const { org, location, locationId, orgId, scopeLabel } = useTenant();
  const { user } = useAuth();
  const allowEdit = user?.role !== "STYLIST";
  const lockOutlet = user?.role === "STYLIST" && Boolean(user.locationId || location?.locationId);

  const outlets = useMemo(
    () =>
      org.locations.map((l) => ({
        name: l.name,
        locationId: Number(l.locationId) || 0,
      })),
    [org.locations],
  );

  const defaultOutlet = useMemo(() => {
    if (locationId !== "all") {
      return outlets.find((o) => o.locationId === Number(locationId)) ?? outlets[0];
    }
    return outlets[0];
  }, [outlets, locationId]);

  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerRes[]>([]);
  const [memberships, setMemberships] = useState<MembershipRes[]>([]);
  const [plans, setPlans] = useState<MembershipPlanRes[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<CustomerRes | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const oid = Number(orgId) || 0;

  const load = async () => {
    if (!oid) return;
    try {
      setIsLoading(true);
      const req = { orgId: oid };
      const [customerRows, membershipRows, planRows] = await Promise.all([
        customerService.select(req),
        membershipService.select(req),
        membershipPlanService.select(req),
      ]);
      setCustomers(customerRows ?? []);
      setMemberships(membershipRows ?? []);
      setPlans(planRows ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [oid]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, locationId]);

  const applyOutlet = (row: CustomerRes, outletName: string): CustomerRes => {
    const match = outlets.find((o) => o.name === outletName);
    return {
      ...row,
      outlet: outletName,
      locationId: match?.locationId ?? row.locationId,
    };
  };

  const scopedCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (Number(c.orgId) !== oid) return false;
      if (locationId === "all") return true;
      return Number(c.locationId) === Number(locationId);
    });
  }, [customers, oid, locationId]);

  const uniqueRows = useMemo(() => {
    const best = new Map<string, CustomerRes>();
    for (const row of scopedCustomers) {
      const digits = phoneDigits(row.phone ?? "");
      const key = digits.length >= 10 ? digits : `id:${row.id}`;
      if (!best.has(key)) best.set(key, row);
    }
    return [...best.values()];
  }, [scopedCustomers]);

  const planMap = useMemo(() => {
    const map = new Map<string, MembershipPlanRes>();
    for (const p of plans) {
      map.set(String(p.id), p);
      map.set(String(p.name), p);
    }
    return map;
  }, [plans]);

  const membershipMap = useMemo(() => {
    const map = new Map<string, MembershipRes>();
    for (const m of memberships) map.set(String(m.id), m);
    return map;
  }, [memberships]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return uniqueRows;
    return uniqueRows.filter((r) =>
      [r.name, r.phone, r.email, r.outlet, r.tier, r.notes].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [uniqueRows, debouncedQuery]);

  const enhancedRows = useMemo<ListRow[]>(() => {
    return filtered.map((row) => {
      const mem = membershipMap.get(String(row.membershipId ?? ""));
      const plan = mem ? (planMap.get(String(mem.planId ?? "")) ?? planMap.get(String(mem.plan ?? ""))) : undefined;
      return {
        ...row,
        membershipLabel: plan ? plan.name : mem ? String(mem.plan || mem.id) : "—",
      };
    });
  }, [filtered, membershipMap, planMap]);

  const totalPages = Math.max(1, Math.ceil(enhancedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(
    () => enhancedRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [enhancedRows, safePage],
  );

  const membershipOptions = useMemo(() => {
    if (!editing) return [];
    const cid = Number(editing.id) || 0;
    return memberships.filter((m) => {
      const owner = Number(m.customerId) || 0;
      return !owner || owner === cid || Number(m.id) === Number(editing.membershipId);
    });
  }, [editing, memberships]);

  const editingMembership = editing ? membershipMap.get(String(editing.membershipId ?? "")) : undefined;
  const editingPlan = editingMembership
    ? (planMap.get(String(editingMembership.planId ?? "")) ?? planMap.get(String(editingMembership.plan ?? "")))
    : undefined;

  const onView = useCallback(
    (id: string) => {
      void navigate({ to: "/customers/$customerId", params: { customerId: id } });
    },
    [navigate],
  );

  const onEdit = useCallback((row: CustomerRes) => {
    setIsNew(false);
    setEditing({ ...row });
  }, []);

  const onDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const saveCustomer = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Enter a name");
      return;
    }
    const outletName = (editing.outlet || defaultOutlet?.name || "").trim();
    if (!outletName) {
      toast.error("Select an outlet first");
      return;
    }
    const payload = applyOutlet({ ...editing, orgId: oid, membershipId: Number(editing.membershipId) || 0 }, outletName);
    if (!Number(payload.locationId)) {
      toast.error("Outlet has no location — check Outlets page");
      return;
    }
    if (isNew && payload.phone.trim()) {
      const digits = phoneDigits(payload.phone);
      const existing = customers.find((c) => Number(c.orgId) === oid && phoneDigits(c.phone) === digits && digits.length >= 10);
      if (existing) {
        toast.error("This phone already has a customer. Bill the service on that profile.");
        return;
      }
    }
    try {
      setIsLoading(true);
      await customerService.save({
        ...payload,
        birthday: apiDate(payload.birthday),
        anniversary: apiDate(payload.anniversary),
        lastVisit: apiDate(payload.lastVisit),
        createdon: apiDate(payload.createdon),
        updatedon: apiDate(payload.updatedon),
      } as CustomerRes);
      toast.success(isNew ? "Customer created" : "Customer updated");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async () => {
    if (!deleteId) return;
    try {
      setIsLoading(true);
      await customerService.delete({ id: Number(deleteId), orgId: oid });
      toast.success("Customer deleted");
      setDeleteId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setIsLoading(false);
    }
  };

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
              setEditing(
                emptyCustomer(oid, defaultOutlet?.locationId ?? 0, defaultOutlet?.name ?? ""),
              );
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
            {isLoading ? "Loading…" : `${enhancedRows.length} of ${scopedCustomers.length} · page ${safePage + 1} / ${totalPages}`}
          </p>
        </div>

        {enhancedRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{isLoading ? "Loading customers…" : "No records found."}</p>
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
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Phone</Label>
                <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Email</Label>
                <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Gender</Label>
                <Select value={editing.gender} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
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
                <Input type="date" value={dateInput(editing.birthday)} onChange={(e) => setEditing({ ...editing, birthday: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Anniversary</Label>
                <Input type="date" value={dateInput(editing.anniversary)} onChange={(e) => setEditing({ ...editing, anniversary: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Household / family</Label>
                <Input value={editing.household} onChange={(e) => setEditing({ ...editing, household: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Tier</Label>
                <Select value={editing.tier} onValueChange={(v) => setEditing({ ...editing, tier: v })}>
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
                  value={String(editing.walletBalance ?? 0)}
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
                      outlets.find((o) => o.locationId === Number(editing.locationId))?.name ??
                      editing.outlet ??
                      location?.name ??
                      "—"
                    }
                  />
                ) : outlets.length > 0 ? (
                  <Select value={editing.outlet} onValueChange={(v) => setEditing(applyOutlet(editing, v))}>
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
                  <Input readOnly className="bg-muted" value="No outlets — add one under Outlets first" />
                )}
              </div>
              <div>
                <Label className="mb-1.5">Last visit</Label>
                <Input type="date" value={dateInput(editing.lastVisit)} onChange={(e) => setEditing({ ...editing, lastVisit: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5">Membership</Label>
                <Select
                  value={editing.membershipId ? String(editing.membershipId) : NONE}
                  onValueChange={(v) => setEditing({ ...editing, membershipId: v === NONE ? 0 : Number(v) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No membership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No membership</SelectItem>
                    {membershipOptions.map((m) => {
                      const optionPlan = planMap.get(String(m.planId ?? "")) ?? planMap.get(String(m.plan ?? ""));
                      return (
                        <SelectItem key={String(m.id)} value={String(m.id)}>
                          {optionPlan?.name ?? m.plan ?? m.id} · {String(m.id)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {editingMembership ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {editingPlan?.name ?? editingMembership.plan} · {editingMembership.status} · {dateInput(editingMembership.startDate)} →{" "}
                    {dateInput(editingMembership.endDate)}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5">Notes</Label>
                <Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm sm:col-span-2">
                <p className="font-medium">Balances (updated by POS)</p>
                <p className="mt-1 text-muted-foreground">
                  Loyalty {Number(editing.points ?? 0).toLocaleString("en-IN")} pts · wallet ₹
                  {Number(editing.walletBalance ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={() => void saveCustomer()}>
              {isNew ? "Create customer" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>{deleteId} will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteCustomer()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
