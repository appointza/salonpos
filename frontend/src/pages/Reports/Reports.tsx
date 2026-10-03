import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/pages/Reports/export-csv";
import {
  PERIOD_OPTIONS,
  paidInvoices,
  periodRange,
  revenueByServices,
  revenueByStylists,
  summarizeSales,
  type ReportPeriod,
} from "@/pages/Reports/sales-analytics";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export function Page() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const { orgId, locationId } = useTenant();
  const { allRows } = useData();
  const range = useMemo(() => periodRange(period), [period]);

  const invoices = useMemo(
    () =>
      paidInvoices(allRows.invoices ?? [], range, orgId, locationId === "all" ? undefined : locationId),
    [allRows.invoices, range, orgId, locationId],
  );
  const summary = useMemo(() => summarizeSales(invoices), [invoices]);
  const byService = useMemo(() => revenueByServices(invoices), [invoices]);
  const byStylist = useMemo(
    () => revenueByStylists(allRows.commissions ?? [], invoices, range, allRows.staff ?? []),
    [allRows.commissions, allRows.staff, invoices, range],
  );

  function exportReport() {
    downloadCsv(
      `revenue-${range.start}-${range.end}.csv`,
      ["Type", "Name", "Revenue", "Count"],
      [
        ...byService.map((r) => ["Service", r.name, r.revenue, r.count]),
        ...byStylist.map((r) => ["Stylist", r.name, r.revenue, r.count]),
      ],
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">{range.label} · paid invoices only</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={`₹${summary.revenue.toLocaleString("en-IN")}`} />
        <Stat label="Invoices" value={String(summary.invoices)} />
        <Stat label="Discounts" value={`₹${summary.discounts.toLocaleString("en-IN")}`} />
        <Stat label="Avg ticket" value={`₹${summary.avgTicket.toLocaleString("en-IN")}`} />
      </section>

      <ReportChart title="Revenue by service" data={byService.slice(0, 12)} />
      <ReportTable title="Services" rows={byService} />
      <ReportChart title="Revenue by stylist" data={byStylist.slice(0, 12)} />
      <ReportTable title="Stylists" rows={byStylist} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: { name: string; revenue: number; count: number }[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No paid invoices in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 text-right font-medium">Count</th>
                <th className="py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 text-right tabular-nums">₹{row.revenue.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReportChart({ title, data }: { title: string; data: { name: string; revenue: number }[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 h-72">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No paid invoices in this period.</p>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
