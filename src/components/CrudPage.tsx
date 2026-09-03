import { useMemo, useState } from "react";
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
import { useTenant } from "@/lib/tenant";
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

export function CrudPage({ module }: { module: ModuleDef }) {
  const { rows, create, update, remove } = useCollection(module.key);
  const { org, location, locationId, scopeLabel } = useTenant();
  const locName = (id: string | number | undefined) =>
    org.locations.find((l) => l.locationId === String(id))?.name ?? "—";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const tableFields = module.fields.filter((f) => f.table);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, query]);

  function openNew() {
    setIsNew(true);
    setEditing({
      id: `${module.idPrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      ...emptyRow(module.fields),
      orgId: org.orgId,
      locationId: locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId,
    });
  }

  function save() {
    if (!editing) return;
    const id = String(editing.id);
    if (isNew) {
      create(editing);
      toast.success(`${module.title}: record created`, { description: id });
    } else {
      update(id, editing);
      toast.success(`${module.title}: record updated`, { description: id });
    }
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
          <Button size="sm" onClick={openNew}>
            <Plus /> New record
          </Button>
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">ID</TableHead>
                <TableHead>Location</TableHead>
                {tableFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableFields.length + 3} className="py-12 text-center text-muted-foreground">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{String(row.id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{locName(row["locationId"])}</TableCell>
                    {tableFields.map((f) => (
                      <TableCell key={f.name} className="max-w-[16rem] truncate">
                        {f.badge ? (
                          <Badge variant="secondary">{formatValue(f, row[f.name])}</Badge>
                        ) : (
                          formatValue(f, row[f.name])
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${String(row.id)}`}
                        onClick={() => {
                          setIsNew(false);
                          setEditing({ ...row });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${String(row.id)}`}
                        onClick={() => setDeleteId(String(row.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "New" : "Edit"} {module.title.replace(/s$/, "")}
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
                <Select
                  value={String(editing["locationId"] ?? "")}
                  onValueChange={(v) => setEditing({ ...editing, locationId: v })}
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
              </div>
              {module.fields.map((f) => {
                const value = editing[f.name] ?? "";
                return (
                  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={f.name} className="mb-1.5">
                      {f.label}
                    </Label>
                    {f.type === "select" ? (
                      <Select
                        value={String(value)}
                        onValueChange={(v) => setEditing({ ...editing, [f.name]: v })}
                      >
                        <SelectTrigger id={f.name} className="w-full">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        id={f.name}
                        value={String(value)}
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                      />
                    ) : (
                      <Input
                        id={f.name}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                        value={String(value)}
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>{isNew ? "Create record" : "Save changes"}</Button>
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
