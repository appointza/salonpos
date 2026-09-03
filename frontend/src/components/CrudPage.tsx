import { useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, type Row } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useListView } from "@/lib/list-view";
import { usePermissions } from "@/lib/permissions";
import type { Field, ModuleDef } from "@/lib/modules";

function formatValue(field: Field, value: string | number | undefined) {
  if (value === undefined || value === "") return "—";
  if (field.money) return `₹${Number(value).toLocaleString("en-IN")}`;
  return String(value);
}

function emptyRow(fields: Field[]): Record<string, string | number> {
  return fields.reduce<Record<string, string | number>>(
    (acc, f) => ({ ...acc, [f.name]: f.type === "number" ? 0 : "" }),
    {},
  );
}

export function CrudPage({
  module,
  extraFields,
  extraToolbar,
  newButtonLabel = "New record",
  prepareNew,
  validate,
  displayValue,
  renderCell,
  selectOptions,
  prepareSave,
  onSaved,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  readOnly = false,
  lockedFields = [],
}: {
  module: ModuleDef;
  extraFields?: (ctx: {
    editing: Row;
    setEditing: (row: Row) => void;
    rows: Row[];
    isNew: boolean;
  }) => ReactNode;
  extraToolbar?: (ctx: { openNew: (overrides?: Partial<Row>) => void }) => ReactNode;
  newButtonLabel?: string;
  prepareNew?: (row: Row) => Row;
  validate?: (row: Row, isNew: boolean) => string | null;
  displayValue?: (field: Field, row: Row) => string | undefined;
  renderCell?: (field: Field, row: Row, text: string) => ReactNode;
  selectOptions?: (field: Field) => { value: string; label: string }[] | undefined;
  prepareSave?: (row: Row) => Row;
  onSaved?: (row: Row, isNew: boolean) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
  lockedFields?: string[];
}) {
  const { rows, create, update, remove } = useCollection(module.key);
  const { org, location, locationId, scopeLabel } = useTenant();
  const { user } = useAuth();
  const lockAssignedLocation = user?.role === "STYLIST" && Boolean(user.locationId || location?.locationId);
  const { canEditHere } = usePermissions();
  const allowMutate = user?.role === "SUPER_ADMIN" || canEditHere;
  const { view } = useListView();
  const locName = (id: string | number | undefined) =>
    org.locations.find((l) => l.locationId === String(id))?.name ?? "—";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const tableFields = module.fields.filter((f) => f.table);
  const canCreateHere = canCreate && allowMutate;
  const canEditHereRow = canEdit && allowMutate;
  const canDeleteHere = canDelete && allowMutate;
  const showActions = (canEditHereRow || readOnly) || (canDeleteHere && !readOnly);
  const cellText = (field: Field, row: Row) => displayValue?.(field, row) ?? formatValue(field, row[field.name]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (Object.values(r).some((v) => String(v).toLowerCase().includes(q))) return true;
      return tableFields.some((f) => cellText(f, r).toLowerCase().includes(q));
    });
  }, [rows, query, tableFields, displayValue]);

  function openNew(overrides?: Partial<Row>) {
    setIsNew(true);
    const base: Row = {
      id: `${module.idPrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      ...emptyRow(module.fields),
      orgId: org.orgId,
      locationId: locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId,
      ...overrides,
    };
    setEditing(prepareNew ? prepareNew(base) : base);
  }

  function save() {
    if (!editing) return;
    const payload = prepareSave ? prepareSave(editing) : editing;
    const err = validate?.(payload, isNew);
    if (err) {
      toast.error(err);
      return;
    }
    const id = String(payload.id);
    if (isNew) {
      create(payload);
      toast.success(`${module.title}: record created`, { description: id });
    } else {
      update(id, payload);
      toast.success(`${module.title}: record updated`, { description: id });
    }
    onSaved?.(payload, isNew);
    setEditing(null);
  }

  function exportJson() {
    toast.info("Exported to JSON (demo)", { description: `${filtered.length} rows` });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">{module.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{module.subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-normal">
              Org · {org.name}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              Location · {scopeLabel}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              {org.orgId} / {location?.locationId ?? "all"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download /> Export
          </Button>
          {canCreateHere && !readOnly && (
            <Button size="sm" onClick={() => openNew()}>
              <Plus /> {newButtonLabel}
            </Button>
          )}
          {!readOnly && allowMutate && extraToolbar?.({ openNew })}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${module.title.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {filtered.length} of {rows.length} records
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No records found.</p>
        ) : view === "card" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => {
              const titleField = tableFields.find((f) => f.name === "name") ?? tableFields[0];
              const title = titleField ? cellText(titleField, row) : String(row.id);
              return (
                <div key={String(row.id)} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{title}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{String(row.id)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{locName(row["locationId"])}</p>
                    </div>
                    {showActions && (
                    <div className="flex shrink-0">
                      {(canEditHereRow || readOnly) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${readOnly ? "View" : "Edit"} ${String(row.id)}`}
                        onClick={() => {
                          setIsNew(false);
                          setEditing({ ...row });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      )}
                      {canDeleteHere && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${String(row.id)}`}
                        onClick={() => setDeleteId(String(row.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      )}
                    </div>
                    )}
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {tableFields
                      .filter((f) => f !== titleField)
                      .map((f) => {
                        const text = cellText(f, row);
                        const custom = renderCell?.(f, row, text);
                        return (
                          <div key={f.name} className="flex items-start justify-between gap-3">
                            <dt className="text-xs text-muted-foreground">{f.label}</dt>
                            <dd className="max-w-[70%] text-right">
                              {custom ?? (f.badge ? <Badge variant="secondary">{text}</Badge> : text)}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                </div>
              );
            })}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">ID</TableHead>
                <TableHead>Location</TableHead>
                {tableFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{String(row.id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{locName(row["locationId"])}</TableCell>
                    {tableFields.map((f) => {
                      const text = cellText(f, row);
                      const custom = renderCell?.(f, row, text);
                      return (
                        <TableCell key={f.name} className={custom ? "max-w-[18rem]" : "max-w-[16rem] truncate"}>
                          {custom ??
                            (f.badge ? <Badge variant="secondary">{text}</Badge> : text)}
                        </TableCell>
                      );
                    })}
                    {showActions && (
                    <TableCell className="text-right whitespace-nowrap">
                      {(canEditHereRow || readOnly) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${readOnly ? "View" : "Edit"} ${String(row.id)}`}
                        onClick={() => {
                          setIsNew(false);
                          setEditing({ ...row });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      )}
                      {canDeleteHere && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${String(row.id)}`}
                        onClick={() => setDeleteId(String(row.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      )}
                    </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "New" : readOnly ? "View" : "Edit"} {module.title.replace(/s$/, "")}
            </DialogTitle>
            <DialogDescription>Record ID {editing ? String(editing.id) : ""}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5">Organisation</Label>
                <Input value={org.name} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="mb-1.5">Location</Label>
                {lockAssignedLocation ? (
                  <Input
                    readOnly
                    className="bg-muted"
                    value={
                      org.locations.find((l) => l.locationId === String(editing["locationId"] ?? ""))?.name ??
                      location?.name ??
                      "—"
                    }
                  />
                ) : (
                <Select
                  value={String(editing["locationId"] ?? "")}
                  onValueChange={(v) => setEditing({ ...editing, locationId: v })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    {org.locations.map((l) => (
                      <SelectItem key={l.locationId} value={l.locationId}>
                        {l.name} · {l.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}
              </div>
              {module.fields.filter((f) => f.form !== false).map((f) => {
                const value = editing[f.name] ?? "";
                const locked = readOnly || lockedFields.includes(f.name);
                return (
                  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={f.name} className="mb-1.5">
                      {f.label}
                    </Label>
                    {f.type === "select" ? (
                      <Select
                        value={String(value)}
                        onValueChange={(v) => setEditing({ ...editing, [f.name]: v })}
                        disabled={locked}
                      >
                        <SelectTrigger id={f.name} className="w-full">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectOptions?.(f) ?? (f.options ?? []).map((o) => ({ value: o, label: o }))).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        id={f.name}
                        value={String(value)}
                        disabled={locked}
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                      />
                    ) : (
                      <Input
                        id={f.name}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                        value={String(value)}
                        disabled={locked}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                );
              })}
              {extraFields?.({ editing, setEditing, rows, isNew })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && <Button onClick={save}>{isNew ? "Create record" : "Save changes"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId} will be removed from the demo dataset. You can restore everything from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  remove(deleteId);
                  toast.success("Record deleted", { description: deleteId });
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
