import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection, useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { useListView } from "@/lib/list-view";
import { deriveAttendanceRows, monthRange, type DerivedAttendance } from "@/lib/hr";

const title = "Attendance — Luxe Salon CRM";
const description = "Check-ins compared to published shifts. Approved leave fills Leave days automatically.";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

const moneyStatus = (s: string) =>
  s === "Leave" ? "secondary" : s === "Absent" ? "destructive" : s === "Late" || s === "Early" ? "outline" : "secondary";

function Page() {
  const { org, scopeLabel } = useTenant();
  const { view } = useListView();
  const { create, update } = useData();
  const { rows: staff } = useCollection("staff");
  const { rows: shifts } = useCollection("shifts");
  const { rows: punches } = useCollection("attendance");
  const { rows: leaves } = useCollection("leaves");
  const [period, setPeriod] = useState("2026-08");
  const [editing, setEditing] = useState<DerivedAttendance | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const { from, to } = monthRange(period);

  const rows = useMemo(
    () => deriveAttendanceRows({ from, to, staff, shifts, punches, leaves }),
    [from, to, staff, shifts, punches, leaves],
  );

  function openPunch(row: DerivedAttendance) {
    if (row.status === "Leave") return void toast.info("This day is covered by approved leave");
    setEditing(row);
    setCheckIn(row.checkIn);
    setCheckOut(row.checkOut);
  }

  function savePunch() {
    if (!editing) return;
    const payload: Row = {
      id: editing.punchId || `AT-${Math.floor(8000 + Math.random() * 1999)}`,
      staffId: editing.staffId,
      date: editing.date,
      checkIn,
      checkOut,
      remarks: editing.remarks,
      locationId: editing.locationId,
    };
    if (editing.punchId) update("attendance", editing.punchId, payload);
    else create("attendance", payload);
    toast.success("Punch saved", { description: `${editing.staffName} · ${editing.date}` });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Attendance</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Shifts set expected hours. Leave (approved) marks the day as Leave. Punches are compared to the roster —
            hours, late, early checkout, overtime and absent are calculated.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Org · {org.name}</Badge>
            <Badge variant="secondary">Location · {scopeLabel}</Badge>
          </div>
        </div>
        <div>
          <Label className="mb-1.5">Month</Label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          No shifts, punches or approved leave in this month.
        </div>
      ) : view === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={`${r.staffId}-${r.date}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.staffName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{r.date}</p>
                </div>
                <Badge variant={moneyStatus(r.status)}>{r.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Shift {r.shiftStart ? `${r.shiftStart}–${r.shiftEnd}` : "—"}
              </p>
              <p className="mt-1 text-sm">
                In {r.checkIn || "—"} · Out {r.checkOut || "—"} · {r.hours || 0}h
                {r.overtime ? ` · OT ${r.overtime}` : ""}
              </p>
              {r.remarks ? <p className="mt-1 text-xs text-muted-foreground">{r.remarks}</p> : null}
              {r.status !== "Leave" ? (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => openPunch(r)}>
                  <Clock className="size-4" /> Punch
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>In</TableHead>
              <TableHead>Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.staffId}-${r.date}`}>
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell>
                    {r.staffName}
                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">{r.staffId}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.shiftStart ? `${r.shiftStart}–${r.shiftEnd}` : "—"}
                  </TableCell>
                  <TableCell>{r.checkIn || "—"}</TableCell>
                  <TableCell>{r.checkOut || "—"}</TableCell>
                  <TableCell>{r.hours || "—"}</TableCell>
                  <TableCell>{r.overtime || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={moneyStatus(r.status)}>{r.status}</Badge>
                    {r.remarks ? <p className="mt-1 text-[11px] text-muted-foreground">{r.remarks}</p> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "Leave" ? null : (
                      <Button variant="ghost" size="sm" onClick={() => openPunch(r)}>
                        <Clock className="size-4" /> Punch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Punch · {editing?.staffName} · {editing?.date}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5">Check in</Label>
              <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Check out</Label>
              <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected {editing?.shiftStart || "—"} – {editing?.shiftEnd || "—"}. Status is calculated after you save.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={savePunch}>Save punch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
