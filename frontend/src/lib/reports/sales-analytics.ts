import type { Row } from "@/lib/store";

export type ReportPeriod = "day" | "week" | "month" | "quarter" | "half" | "year";

export type PeriodRange = { start: string; end: string; label: string };

export type RevenueRow = { name: string; revenue: number; count: number };

export type SalesSummary = {
  revenue: number;
  invoices: number;
  discounts: number;
  tax: number;
  avgTicket: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function periodRange(period: ReportPeriod, anchor = new Date()): PeriodRange {
  const end = new Date(anchor);
  const start = new Date(anchor);
  if (period === "day") {
    return { start: iso(start), end: iso(end), label: "Today" };
  }
  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return { start: iso(start), end: iso(end), label: "This week" };
  }
  if (period === "month") {
    start.setDate(1);
    return { start: iso(start), end: iso(end), label: "This month" };
  }
  if (period === "quarter") {
    const q = Math.floor(start.getMonth() / 3);
    start.setMonth(q * 3, 1);
    return { start: iso(start), end: iso(end), label: "This quarter" };
  }
  if (period === "half") {
    const h = start.getMonth() < 6 ? 0 : 6;
    start.setMonth(h, 1);
    return { start: iso(start), end: iso(end), label: "Half year" };
  }
  start.setMonth(0, 1);
  return { start: iso(start), end: iso(end), label: "This year" };
}

export function inPeriod(dateStr: string, range: PeriodRange) {
  const d = String(dateStr ?? "").slice(0, 10);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

export function paidInvoices(invoices: Row[], range: PeriodRange, orgId?: string, locationId?: string) {
  return invoices.filter((inv) => {
    if (String(inv["status"]) !== "Paid") return false;
    if (orgId && String(inv["orgId"]) !== orgId) return false;
    if (locationId && locationId !== "all" && String(inv["locationId"]) !== locationId) return false;
    return inPeriod(String(inv["date"] ?? ""), range);
  });
}

export function summarizeSales(invoices: Row[]): SalesSummary {
  const revenue = invoices.reduce((s, i) => s + Number(i["total"] ?? 0), 0);
  const discounts = invoices.reduce(
    (s, i) =>
      s +
      Number(i["discount"] ?? 0) +
      Number(i["membershipDiscount"] ?? 0) +
      Number(i["rewardDiscount"] ?? 0) +
      Number(i["couponDiscount"] ?? 0) +
      Number(i["pointsValue"] ?? 0),
    0,
  );
  const tax = invoices.reduce((s, i) => s + Number(i["tax"] ?? 0), 0);
  const count = invoices.length;
  return {
    revenue: Math.round(revenue),
    invoices: count,
    discounts: Math.round(discounts),
    tax: Math.round(tax),
    avgTicket: count ? Math.round(revenue / count) : 0,
  };
}

/** Parse `Haircut x1, Shampoo x2` style invoice items. */
export function revenueByServices(invoices: Row[]): RevenueRow[] {
  const map = new Map<string, { revenue: number; count: number }>();
  for (const inv of invoices) {
    const share = Number(inv["total"] ?? 0);
    const parts = String(inv["items"] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      const key = "Other";
      const prev = map.get(key) ?? { revenue: 0, count: 0 };
      map.set(key, { revenue: prev.revenue + share, count: prev.count + 1 });
      continue;
    }
    const each = share / parts.length;
    for (const part of parts) {
      const name = part.replace(/\s+x\d+$/i, "").trim() || part;
      const qtyMatch = part.match(/x(\d+)$/i);
      const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
      const prev = map.get(name) ?? { revenue: 0, count: 0 };
      map.set(name, { revenue: prev.revenue + each, count: prev.count + qty });
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), count: v.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function revenueByStylists(commissions: Row[], invoices: Row[], range: PeriodRange, staff: Row[]) {
  const invIds = new Set(invoices.map((i) => String(i.id)));
  const map = new Map<string, { revenue: number; count: number }>();
  for (const cm of commissions) {
    if (!invIds.has(String(cm["invoiceId"]))) continue;
    if (!inPeriod(String(cm["date"] ?? ""), range)) continue;
    const staffId = String(cm["staffId"] ?? "");
    const person = staff.find((s) => String(s.id) === staffId);
    const name = String(person?.["name"] ?? cm["staff"] ?? (staffId || "Unassigned"));
    const base = Number(cm["baseAmount"] ?? 0);
    const prev = map.get(name) ?? { revenue: 0, count: 0 };
    map.set(name, { revenue: prev.revenue + base, count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), count: v.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

export const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "half", label: "Half year" },
  { value: "year", label: "Year" },
];
