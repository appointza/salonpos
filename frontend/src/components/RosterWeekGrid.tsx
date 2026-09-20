import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Row } from "@/lib/store";
import { staffName } from "@/lib/hr";

function weekDates(anchor = new Date()) {
  const start = new Date(anchor);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function RosterWeekGrid({ shifts, staff }: { shifts: Row[]; staff: Row[] }) {
  const days = useMemo(() => weekDates(), []);
  const staffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of shifts) ids.add(String(s["staffId"]));
    for (const s of staff) ids.add(String(s.id));
    return [...ids].filter(Boolean);
  }, [shifts, staff]);

  const byKey = useMemo(() => {
    const map = new Map<string, Row>();
    for (const s of shifts) map.set(`${s["staffId"]}|${String(s["date"]).slice(0, 10)}`, s);
    return map;
  }, [shifts]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            {days.map((d) => (
              <TableHead key={d} className="min-w-[7rem] text-center text-xs">
                {new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffIds.map((id) => (
            <TableRow key={id}>
              <TableCell className="font-medium whitespace-nowrap">{staffName(staff, id)}</TableCell>
              {days.map((d) => {
                const shift = byKey.get(`${id}|${d}`);
                if (!shift) return <TableCell key={d} className="text-center text-muted-foreground">—</TableCell>;
                return (
                  <TableCell key={d} className="text-center text-xs">
                    <div>{String(shift["startTime"])}–{String(shift["endTime"])}</div>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{String(shift["status"])}</Badge>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
