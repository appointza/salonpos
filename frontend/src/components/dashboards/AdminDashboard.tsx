import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Copy,
  Download,
  Eye,
  IndianRupee,
  List,
  MessageCircle,
  Palette,
  QrCode,
  RotateCcw,
  Star,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashHeader, DashStat } from "@/components/dashboards/shared";
import { listLowStockAlerts } from "@/lib/business/inventory-service";
import { paidInvoices, periodRange, summarizeSales, type ReportPeriod } from "@/lib/reports/sales-analytics";
import { useData } from "@/lib/store";
import { generateSlots } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/lib/tenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_OPTIONS } from "@/lib/reports/sales-analytics";

const CHECKLIST = [
  { key: "setup", label: "Complete easy setup", to: "/setup" },
  { key: "services", label: "Add your services", to: "/services" },
  { key: "staff", label: "Configure staff schedules", to: "/staff" },
  { key: "qr", label: "Create your first QR code", to: "/loyalty" },
  { key: "menu", label: "Import your digital menu", to: "/services" },
  { key: "loyalty", label: "Set up loyalty program", to: "/loyalty" },
  { key: "rewards", label: "Create a reward", to: "/memberships" },
  { key: "whatsapp", label: "Integrate WhatsApp ordering", to: "/campaigns" },
] as const;

export function AdminDashboard() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const { db, reset } = useData();
  const { org, user, toggleChecklist } = useAuth();
  const { org: tenant, location, locationId, scopeLabel } = useTenant();
  const range = useMemo(() => periodRange(period), [period]);
  const paid = useMemo(
    () => paidInvoices(db["invoices"] ?? [], range, tenant.orgId, location?.locationId ?? locationId),
    [db, range, tenant.orgId, location, locationId],
  );
  const sales = useMemo(() => summarizeSales(paid), [paid]);
  const revenue = sales.revenue;
  const upcoming = (db["appointments"] ?? []).filter((a) => a["status"] === "Confirmed" || a["status"] === "Pending");
  const lowStock = listLowStockAlerts(
    db,
    tenant.orgId,
    location?.locationId ?? (locationId === "all" ? undefined : locationId),
  );
  const ratings = db["feedback"] ?? [];
  const avgRating = ratings.length
    ? (ratings.reduce((s, f) => s + Number(f["rating"] ?? 0), 0) / ratings.length).toFixed(1)
    : "—";

  const byOutlet = Object.values(
    paid.reduce<Record<string, { outlet: string; revenue: number }>>((acc, inv) => {
      const key = String(inv["outlet"]);
      acc[key] = { outlet: key, revenue: (acc[key]?.revenue ?? 0) + Number(inv["total"] ?? 0) };
      return acc;
    }, {}),
  );

  const slots = org ? generateSlots(org.hours, Number(org.slots.duration), Number(org.slots.buffer)) : [];

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const bookingUrl = `${origin || "https://kriosapp.com"}/${tenant.slug}`;
  const checkinLoc = location?.locationId ?? tenant.locations[0]?.locationId ?? "loc-bandra";
  const checkinUrl = `${origin || "https://kriosapp.com"}/${tenant.slug}${location ? `?loc=${checkinLoc}` : ""}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeUrl(checkinUrl)}`;
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckins = (db["qrCheckins"] ?? []).filter((c) => String(c["visitAt"] ?? "").startsWith(today)).length;
  const approvedVisits = (db["qrCheckins"] ?? []).filter((c) => String(c["status"]) === "Approved");
  const returning = approvedVisits.filter((c) => {
    const cust = (db["customers"] ?? []).find((x) => String(x.id) === String(c["customerId"]));
    return Number(cust?.["totalVisits"] ?? 0) >= 2;
  }).length;

  const services = db["services"] ?? [];
  const activeItems = services.filter((s) => String(s["active"] ?? "Yes") !== "No").length;
  const categories = useMemo(
    () => new Set(services.map((s) => String(s["category"] ?? "General").trim()).filter(Boolean)).size,
    [services],
  );
  const waOn = Boolean(org?.features?.includes("WhatsApp Ordering") || org?.completed?.includes("whatsapp"));

  async function copyBookingUrl() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied — share it with customers");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  async function downloadQr() {
    try {
      const res = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&margin=40&data=${encodeUrl(checkinUrl)}`,
      );
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${tenant.slug}-checkin-qr.png`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Print file downloaded");
    } catch {
      toast.error("Couldn't download the QR file");
    }
  }

  return (
    <div className="space-y-8">
      <DashHeader
        kicker="Admin console"
        title={`Welcome back${user ? `, ${user.name}` : ""}`}
        subtitle={
          <>
            {tenant.name} · {scopeLabel}
            {tenant.domain ? ` · ${tenant.domain}` : ""}
            {location ? ` · ${location.city}` : ""}
          </>
        }
        extra={
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Public booking link</span>
            <a
              href={`/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {origin}/{tenant.slug}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}/${tenant.slug}`);
                toast.success("Booking link copied — share it with customers");
              }}
            >
              Copy link
            </Button>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              toast.success("Demo data restored");
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(260px,22rem)_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Outlet check-in QR</h2>
            <QrCode className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-5 flex justify-center">
            <div className="rounded-xl border border-border bg-background p-3">
              <img src={qrSrc} alt={`QR code for ${checkinUrl}`} width={220} height={220} className="size-[220px]" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={checkinUrl}>
              {checkinUrl}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => {
                void navigator.clipboard.writeText(checkinUrl);
                toast.success("Check-in link copied");
              }}
              aria-label="Copy check-in link"
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => void downloadQr()}>
            <Download /> Download Print File
          </Button>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Active items</p>
                <ClipboardList className="size-4 text-muted-foreground" />
              </div>
              <p className="font-display mt-4 text-4xl tracking-tight">{activeItems}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Categories</p>
                <List className="size-4 text-muted-foreground" />
              </div>
              <p className="font-display mt-4 text-4xl tracking-tight">{categories}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Today's check-ins</p>
                <Eye className="size-4 text-muted-foreground" />
              </div>
              <p className="font-display mt-4 text-4xl tracking-tight">{todayCheckins}</p>
              <p className="mt-1 text-xs text-muted-foreground">{returning} returning on approved visits</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">Quick Actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { to: "/services", icon: ClipboardList, color: "bg-orange-100 text-orange-600", title: "Manage Menu", text: "Add, edit, or remove items across categories." },
                { to: "/settings", icon: Palette, color: "bg-blue-100 text-blue-600", title: "Change Style", text: "Modify colors, logo, and branding globally." },
                { to: "/services", icon: Upload, color: "bg-muted text-muted-foreground", title: "Import Menu", text: "Upload CSV or PDF to generate items automatically." },
                { to: "/loyalty", icon: QrCode, color: "bg-violet-100 text-violet-700", title: "Loyalty & QR", text: "Programs, wheel prizes, and outlet QR codes." },
                { to: "/campaigns", icon: MessageCircle, color: "bg-emerald-100 text-emerald-700", title: "WA Ordering", text: "Customers order directly via WhatsApp.", badge: waOn ? "ON" : "OFF" },
              ].map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                  className="relative rounded-xl border border-border p-4 transition-colors hover:bg-accent"
                >
                  {"badge" in action && action.badge && (
                    <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
                      {action.badge}
                    </Badge>
                  )}
                  <span className={`inline-flex size-9 items-center justify-center rounded-lg ${action.color}`}>
                    <action.icon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {org && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Finish your setup</h2>
              <p className="text-xs text-muted-foreground">
                {org.completed.length} of {CHECKLIST.length + 3} setup items complete
              </p>
            </div>
            <Badge variant="secondary">
              {org.plan} plan · {org.slots.duration} min slots · {slots.length} slots/day
            </Badge>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((c) => {
              const done = org.completed.includes(c.key);
              return (
                <li key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <button type="button" className="flex items-center gap-2 text-left" onClick={() => toggleChecklist(c.key)}>
                    {done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                  </button>
                  <Link to={c.to} className="text-xs text-primary hover:underline">
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link to="/reports" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Full reports & export <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashStat icon={IndianRupee} label="Collected revenue" value={`₹${revenue.toLocaleString("en-IN")}`} hint={`${range.label} · ${sales.invoices} invoices`} />
        <DashStat icon={CalendarDays} label="Open bookings" value={String(upcoming.length)} hint="Pending + confirmed" />
        <DashStat icon={Users} label="Customers" value={String((db["customers"] ?? []).length)} hint="Across outlets in view" />
        <DashStat icon={Star} label="Avg. rating" value={String(avgRating)} hint={`${ratings.length} feedback entries`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide">Revenue by outlet</h2>
            <span className="text-xs text-muted-foreground">{range.label}</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byOutlet}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="outlet" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-destructive" />
              <h2 className="text-sm font-semibold">Low stock</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.length === 0 && <li className="text-muted-foreground">All items above reorder level.</li>}
              {lowStock.map((i) => (
                <li key={i.skuId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <Badge variant={i.expired ? "destructive" : "secondary"}>{i.remaining} left</Badge>
                </li>
              ))}
            </ul>
            <Link to="/inventory" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Manage inventory <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Today's schedule</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {upcoming.slice(0, 4).map((a) => (
                <li key={String(a.id)} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {String(a["time"])} · {String(a["customer"])}
                  </span>
                  <span className="text-xs text-muted-foreground">{String(a["staff"])}</span>
                </li>
              ))}
            </ul>
            <Link to="/appointments" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open bookings <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function encodeUrl(value: string) {
  return encodeURIComponent(value);
}
