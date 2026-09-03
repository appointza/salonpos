import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { useListView } from "@/lib/list-view";
import { deriveAttendanceRows, monthRange, payrollForStaff } from "@/lib/hr";

const title = "Payroll — Luxe Salon CRM";
const description = "Net pay from staff salary, attendance/leave and the commission ledger.";

export const Route = createFileRoute("/payroll")({
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

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Page() {
  const { org, scopeLabel } = useTenant();
  const { view } = useListView();
  const { create, update } = useData();
  const { rows: staff } = useCollection("staff");
  const { rows: shifts } = useCollection("shifts");
  const { rows: punches } = useCollection("attendance");
  const { rows: leaves } = useCollection("leaves");
  const { rows: commissions } = useCollection("commissions");
  const { rows: payroll } = useCollection("payroll");
  const [period, setPeriod] = useState("2026-08");

  const { from, to } = monthRange(period);
  const attendance = useMemo(
    () => deriveAttendanceRows({ from, to, staff, shifts, punches, leaves }),
    [from, to, staff, shifts, punches, leaves],
  );

  const rows = staff.map((person) => {
    const adjustment = payroll.find((p) => String(p["staffId"]) === String(person.id) && String(p["period"]) === period) ?? null;
    return payrollForStaff({ staff: person, period, attendance, commissions, adjustment });
  });

  function setStatus(staffId: string, status: string) {
    const existing = payroll.find((p) => String(p["staffId"]) === staffId && String(p["period"]) === period);
    const calc = rows.find((r) => r.staffId === staffId);
    if (!calc) return;
    const payDate = status === "Draft" ? "" : new Date().toISOString().slice(0, 10);
    if (existing) {
      update("payroll", String(existing.id), { ...existing, status, payDate });
    } else {
      create("payroll", {
        id: `PR-${period.replace("-", "")}-${staffId.replace(/\D/g, "")}`,
        staffId,
        period,
        incentive: calc.incentive,
        extraDeductions: calc.extraDeductions,
        status,
        payDate,
      });
    }
    toast.success(`Payroll ${status.toLowerCase()}`, { description: calc.staffName });
  }

  function saveAdjustment(staffId: string, field: "incentive" | "extraDeductions", value: number) {
    const existing = payroll.find((p) => String(p["staffId"]) === staffId && String(p["period"]) === period);
    const calc = rows.find((r) => r.staffId === staffId);
    if (!calc) return;
    if (existing) update("payroll", String(existing.id), { ...existing, [field]: value });
    else
      create("payroll", {
        id: `PR-${period.replace("-", "")}-${staffId.replace(/\D/g, "")}`,
        staffId,
        period,
        incentive: field === "incentive" ? value : calc.incentive,
        extraDeductions: field === "extraDeductions" ? value : calc.extraDeductions,
        status: calc.status,
        payDate: calc.payDate,
      });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Payroll</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Base salary comes from Staff. Commission is the sum of the commission ledger for the month. Unpaid leave and
            absences deduct a daily rate (salary ÷ 30). Incentive and extra deductions are the only typed adjustments.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Org · {org.name}</Badge>
            <Badge variant="secondary">Location · {scopeLabel}</Badge>
          </div>
        </div>
        <div>
          <Label className="mb-1.5">Period</Label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
      </header>

      {view === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.staffId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="font-medium">{r.staffName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{r.staffId}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Present {r.presentDays}/{r.workingDays || "—"} · Leave {r.leaveDays} · Absent {r.absentDays}
              </p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Base</dt><dd>{money(r.baseSalary)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Commission</dt><dd>{money(r.commission)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">OT</dt><dd>{money(r.overtimePay)}</dd></div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Incentive</dt>
                  <dd>
                    <Input type="number" className="h-8 w-24" value={r.incentive} onChange={(e) => saveAdjustment(r.staffId, "incentive", Number(e.target.value))} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Extra deductions</dt>
                  <dd>
                    <Input type="number" className="h-8 w-24" value={r.extraDeductions} onChange={(e) => saveAdjustment(r.staffId, "extraDeductions", Number(e.target.value))} />
                  </dd>
                </div>
                <div className="flex justify-between font-medium"><dt>Net pay</dt><dd>{money(r.netPay)}</dd></div>
              </dl>
              <Select value={r.status} onValueChange={(v) => setStatus(r.staffId, v)}>
                <SelectTrigger className="mt-3 h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Leave</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Incentive</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net pay</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.staffId}>
                <TableCell>
                  {r.staffName}
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">{r.staffId}</span>
                </TableCell>
                <TableCell>
                  {r.presentDays}/{r.workingDays || "—"}
                </TableCell>
                <TableCell>{r.leaveDays}</TableCell>
                <TableCell>{r.absentDays}</TableCell>
                <TableCell>{money(r.baseSalary)}</TableCell>
                <TableCell>{money(r.commission)}</TableCell>
                <TableCell>{money(r.overtimePay)}</TableCell>
                <TableCell className="w-28">
                  <Input
                    type="number"
                    className="h-8"
                    value={r.incentive}
                    onChange={(e) => saveAdjustment(r.staffId, "incentive", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="mb-1 h-8 w-28"
                    value={r.extraDeductions}
                    onChange={(e) => saveAdjustment(r.staffId, "extraDeductions", Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">{money(r.deductions)} total</p>
                </TableCell>
                <TableCell className="font-medium">{money(r.netPay)}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => setStatus(r.staffId, v)}>
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
