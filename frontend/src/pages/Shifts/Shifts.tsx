import { useMemo, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { placeFromStaff, staffName } from "@/pages/Attendance/hr";
import { addLocalDays, localToday, useBookingRules } from "@/pages/Book/booking-rules";
import { resolveStaffForUser } from "@/pages/Staff/staff-scope";
import { useCollection, useData, type Row } from "@/store";
import { useTenant } from "@/tenant";
import {
  parseStaffIds,
  plannedShiftRows,
  shiftTimesFromHours,
  staffAtLocation,
  toggleStaffId,
  windowsFromRow,
} from "@/pages/Shifts/from-hours";

const shiftsModule: ModuleDef = {
  key: "shifts",
  title: "Shifts & Roster",
  subtitle: "Expected hours for attendance. Rosters are per staff, outlet and date — times follow Settings opening hours.",
  idPrefix: "SH-",
  fields: [
    { name: "staffId", label: "Staff", type: "select", table: true },
    { name: "date", label: "From date", type: "date", table: true },
    { name: "startTime", label: "First shift start", type: "time", table: true },
    { name: "endTime", label: "First shift end", type: "time", table: true },
    { name: "splitStart", label: "Second shift start", type: "time", table: true },
    { name: "splitEnd", label: "Second shift end", type: "time", table: true },
    { name: "shiftType", label: "Shift type", type: "select", options: ["Morning", "Evening", "General", "Split"], table: true },
    {
      name: "weeklyOff",
      label: "Weekly off",
      type: "select",
      options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    { name: "status", label: "Status", type: "select", options: ["Draft", "Published"], table: true, badge: true },
  ],
};

function setStaffIds(row: Row, ids: string[]): Row {
  return { ...row, staffIds: ids.join(","), staffId: ids[0] ?? "" };
}

export function Page() {
  const { user } = useAuth();
  const { org, locationId } = useTenant();
  const { allRows, orgId } = useData();
  const { rows: staff } = useCollection("staff");
  const { rows: existingShifts, create } = useCollection("shifts");
  const { rules } = useBookingRules();
  const isStylist = user?.role === "STYLIST";
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    user,
  );
  const [fillOpen, setFillOpen] = useState(false);
  const [fillFrom, setFillFrom] = useState(localToday());
  const [fillTo, setFillTo] = useState(addLocalDays(localToday(), 6));
  const [filling, setFilling] = useState(false);
  const pendingRows = useRef<Row[]>([]);

  const outlets = useMemo(() => {
    const all = org.locations.map((l) => ({ locationId: String(l.locationId), name: l.name }));
    if (locationId === "all" || !locationId) return all;
    return all.filter((l) => l.locationId === String(locationId));
  }, [org.locations, locationId]);

  function locLabel(id: string | number | undefined) {
    const hit = org.locations.find((l) => String(l.locationId) === String(id));
    return hit?.name ?? String(id || "—");
  }

  function planFor(row: Row, ids: string[]) {
    const from = String(row["date"] || localToday()).slice(0, 10);
    const to = String(row["dateTo"] || from).slice(0, 10);
    const locId = String(row["locationId"] ?? "");
    const locations = locId ? outlets.filter((o) => o.locationId === locId) : outlets;
    return plannedShiftRows({
      orgId,
      locations: locations.length ? locations : outlets,
      staff,
      existing: existingShifts,
      hours: rules.hours,
      from,
      to,
      staffIds: ids,
      windows: windowsFromRow(row),
    });
  }

  function withHours(row: Row): Row {
    const date = String(row["date"] || localToday());
    const times = shiftTimesFromHours(rules.hours, date);
    return {
      ...row,
      date,
      dateTo: String(row["dateTo"] || addLocalDays(date, 6)),
      startTime: String(row["startTime"] || times?.startTime || "10:00"),
      endTime: String(row["endTime"] || times?.endTime || "13:00"),
      splitStart: String(row["splitStart"] || "15:00"),
      splitEnd: String(row["splitEnd"] || "21:00"),
      shiftType: String(row["shiftType"] || "Morning"),
      status: String(row["status"] || "Published"),
    };
  }

  async function fillFromOpeningHours() {
    if (fillTo < fillFrom) {
      toast.error("Pick an end date on or after the start date");
      return;
    }
    const planned = plannedShiftRows({
      orgId,
      locations: outlets,
      staff,
      existing: existingShifts,
      hours: rules.hours,
      from: fillFrom,
      to: fillTo,
    });
    if (!planned.length) {
      toast.message("No new shifts to create", {
        description: "Closed days, missing staff, or those dates already have a roster.",
      });
      setFillOpen(false);
      return;
    }
    setFilling(true);
    try {
      for (const row of planned) await create(row);
      toast.success(`Created ${planned.length} shift${planned.length === 1 ? "" : "s"}`, {
        description: `${outlets.length} outlet${outlets.length === 1 ? "" : "s"} · ${fillFrom} to ${fillTo}`,
      });
      setFillOpen(false);
    } catch {
      /* store toasts errors */
    } finally {
      setFilling(false);
    }
  }

  return (
    <>
      <CrudPage
        module={{
          ...shiftsModule,
          subtitle: isStylist ? "Your published shifts only." : shiftsModule.subtitle,
        }}
        newButtonLabel="New shift"
        displayValue={(field, row) => {
          if (field.name === "staffId") return staffName(staff, row["staffId"]);
          return undefined;
        }}
        selectOptions={(field, row) => {
          if (field.name !== "staffId") return undefined;
          const loc = String(row?.["locationId"] ?? "");
          const pool = loc ? staffAtLocation(staff, loc) : staff;
          return pool.map((s) => ({
            value: String(s.id),
            label: `${String(s["name"])} · ${String(s["outlet"] || locLabel(s["locationId"]))}`,
          }));
        }}
        renderFormField={(field, editing, setEditing) => {
          if (!editing["_multi"]) return undefined;
          if (field.name === "shiftType" || field.name === "weeklyOff") return null;
          if (field.name !== "staffId") return undefined;
          const loc = String(editing["locationId"] ?? "");
          const people = loc ? staffAtLocation(staff, loc) : staff;
          const selected = parseStaffIds(editing).filter((id) => people.some((p) => String(p.id) === id));
          const allOn = people.length > 0 && selected.length === people.length;
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Staff</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => setEditing(setStaffIds(editing, allOn ? [] : people.map((p) => String(p.id))))}
                >
                  {allOn ? "Clear" : "Select all"}
                </Button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {people.length ? (
                  people.map((person) => {
                    const id = String(person.id);
                    const checked = selected.includes(id);
                    return (
                      <label key={id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => setEditing(setStaffIds(editing, toggleStaffId(selected, id)))}
                        />
                        <span>
                          {String(person["name"])} · {String(person["outlet"] || locLabel(person["locationId"]))}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No active staff at this outlet.</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.length} selected. Each person gets every slot on every day in the date range (example: 2
                staff × 7 days × 2 slots = 28 shifts).
              </p>
            </div>
          );
        }}
        prepareNew={(row) =>
          placeFromStaff(
            withHours(
              isStylist && me
                ? {
                    ...row,
                    _multi: 1,
                    staffId: String(me.id),
                    staffIds: String(me.id),
                    locationId: me["locationId"] ?? row["locationId"],
                  }
                : { ...row, _multi: 1, staffId: "", staffIds: "" },
            ),
            staff,
          )
        }
        prepareSave={(row) => {
          const next = placeFromStaff(isStylist && me ? { ...row, staffId: String(me.id) } : row, staff);
          if (next["_multi"]) {
            const ids = parseStaffIds(next);
            const planned = planFor(next, ids);
            pendingRows.current = planned;
            const first = planned[0];
            if (!first) return { ...next, splitStart: "", splitEnd: "" };
            return placeFromStaff(
              {
                ...next,
                ...first,
                staffIds: ids.join(","),
                _multi: 1,
              },
              staff,
            );
          }
          if (String(next["shiftType"]) !== "Split") return { ...next, splitStart: "", splitEnd: "" };
          return next;
        }}
        extraFields={({ editing, setEditing, isNew }) => {
          if (!isNew || !editing["_multi"]) return null;
          const slots = windowsFromRow(editing);
          const from = String(editing["date"] || "");
          const to = String(editing["dateTo"] || from);
          const ids = parseStaffIds(editing);
          const plannedCount = planFor(editing, ids).length;
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dateTo" className="mb-1.5">
                  To date
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={to}
                  onChange={(e) => setEditing({ ...editing, dateTo: e.target.value })}
                />
              </div>
              <p className="self-end text-sm text-muted-foreground">
                First slot e.g. 10:00–13:00, second slot e.g. 15:00–21:00. Clear the second start/end if you only need
                one shift per day.
                {from && to && ids.length
                  ? ` This will create ${plannedCount} shift${plannedCount === 1 ? "" : "s"} (${ids.length} staff × days × ${slots.length || 0} slot${slots.length === 1 ? "" : "s"}).`
                  : ""}
              </p>
            </div>
          );
        }}
        extraToolbar={
          isStylist
            ? undefined
            : () => (
                <Button size="sm" onClick={() => setFillOpen(true)}>
                  <CalendarClock /> Auto generate shifts
                </Button>
              )
        }
        onSaved={(row, isNew) => {
          if (!isNew || !row["_multi"]) return;
          const rest = pendingRows.current.slice(1);
          pendingRows.current = [];
          if (!rest.length) return;
          void (async () => {
            for (const extra of rest) await create(extra);
            toast.success(`Generated ${rest.length + 1} shifts`);
          })();
        }}
        validate={(row, isNew) => {
          if (isNew && row["_multi"]) {
            const ids = parseStaffIds(row);
            if (!ids.length) return "Select at least one staff member";
            if (!row["date"]) return "Pick a from date";
            if (!windowsFromRow(row).length) return "Set at least one shift start and end (e.g. 10:00–13:00)";
            const to = String(row["dateTo"] || row["date"]);
            if (to < String(row["date"])) return "To date must be on or after from date";
            if (!planFor(row, ids).length) {
              return "No shifts to generate — closed days, no staff at this outlet, or those dates already exist";
            }
            return null;
          }
          if (!row["staffId"]) return "Pick a staff member";
          if (!row["date"]) return "Pick a date";
          if (String(row["shiftType"]) === "Split" && (!row["splitStart"] || !row["splitEnd"])) {
            return "A split shift needs a second start and end time";
          }
          return null;
        }}
        lockedFields={isStylist ? ["staffId"] : []}
        canCreate={!isStylist}
        canDelete={!isStylist}
        canEdit={!isStylist}
        readOnly={isStylist}
      />

      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto generate shifts</DialogTitle>
            <DialogDescription>
              For each outlet, every active staff member gets a Published shift on open days from Settings hours. Closed
              / leave days are skipped. Existing staff+date rows are left as they are.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="shift-from" className="mb-1.5">
                From
              </Label>
              <Input id="shift-from" type="date" value={fillFrom} onChange={(e) => setFillFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="shift-to" className="mb-1.5">
                To
              </Label>
              <Input id="shift-to" type="date" value={fillTo} onChange={(e) => setFillTo(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {outlets.length} outlet{outlets.length === 1 ? "" : "s"}
            {outlets.length ? `: ${outlets.map((o) => o.name).join(", ")}` : ""}. Staff without an outlet are placed on
            the first outlet.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void fillFromOpeningHours()} disabled={filling}>
              {filling ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
