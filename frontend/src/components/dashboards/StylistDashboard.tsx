import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Clock,
  IndianRupee,
  PlaneTakeoff,
  Scissors,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashHeader, DashStat, QuickLink, sortAppointments } from "@/components/dashboards/shared";
import { useAuth } from "@/hooks/useAuth";
import { shiftOn } from "@/lib/hr";
import { resolveStaffForUser } from "@/lib/staff-scope";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export function StylistDashboard() {
  const { db, allRows, orgId } = useData();
  const { user } = useAuth();
  const { org, location, scopeLabel } = useTenant();
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    user,
  );
  const appointments = sortAppointments(db["appointments"] ?? []);
  const open = appointments.filter((a) => a["status"] === "Confirmed" || a["status"] === "Pending");
  const ratings = db["feedback"] ?? [];
  const avgRating = ratings.length
    ? (ratings.reduce((s, f) => s + Number(f["rating"] ?? 0), 0) / ratings.length).toFixed(1)
    : "—";
  const commission = (db["commissions"] ?? []).reduce((sum, c) => sum + Number(c["amount"] ?? 0), 0);
  const pendingLeave = (db["leaves"] ?? []).filter((l) => String(l["status"]) === "Pending");
  const today = "2026-08-29";
  const shift = me ? shiftOn(db["shifts"] ?? [], String(me.id), today) : null;

  return (
    <div className="space-y-8">
      <DashHeader
        kicker="Stylist floor"
        title={`Hi${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle={
          <>
            Only your diary, clients and pay. {org.name} · {scopeLabel}
            {location ? ` · ${location.city}` : ""}
          </>
        }
        extra={
          <p className="mt-2 text-xs text-muted-foreground">
            Organisation and outlet are assigned by admin and cannot be changed here.
          </p>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashStat icon={CalendarDays} label="Your bookings" value={String(appointments.length)} hint={`${open.length} still open`} />
        <DashStat icon={Users} label="Your clients" value={String((db["customers"] ?? []).length)} hint="People on your appointments" />
        <DashStat icon={Star} label="Your rating" value={String(avgRating)} hint={`${ratings.length} reviews on your work`} />
        <DashStat
          icon={IndianRupee}
          label="Commission"
          value={`₹${Math.round(commission).toLocaleString("en-IN")}`}
          hint="Ledger for your services"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/appointments" icon={CalendarDays} color="bg-blue-100 text-blue-600" title="My appointments" text="See and update only your bookings." />
        <QuickLink to="/attendance" icon={Clock} color="bg-orange-100 text-orange-600" title="Attendance" text="Check in and out for your shift." />
        <QuickLink to="/leaves" icon={PlaneTakeoff} color="bg-emerald-100 text-emerald-700" title="Leave" text="Request time off for yourself." />
        <QuickLink to="/commissions" icon={IndianRupee} color="bg-muted text-muted-foreground" title="My commission" text="Amounts posted from POS." />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Your appointments</h2>
            <Badge variant="secondary">{appointments.length}</Badge>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {appointments.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No bookings assigned to you in this outlet.</li>
            )}
            {appointments.map((a) => (
              <li key={String(a.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {String(a["date"])} {String(a["time"])} · {String(a["customer"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(a["service"])} · {String(a["duration"] ?? "")} min
                  </p>
                </div>
                <Badge variant="secondary">{String(a["status"])}</Badge>
              </li>
            ))}
          </ul>
          <Link to="/appointments" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open my diary <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Assigned shift</h2>
            </div>
            {shift ? (
              <p className="mt-3 text-sm">
                {String(shift["date"])} · {String(shift["startTime"])}–{String(shift["endTime"])}
                <span className="mt-1 block text-xs text-muted-foreground">{String(shift["status"] ?? "")}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No published shift on the demo floor date (29 Aug).</p>
            )}
            <Link to="/shifts" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View roster <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PlaneTakeoff className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Leave</h2>
            </div>
            <p className="mt-3 text-sm">
              {pendingLeave.length > 0 ? `${pendingLeave.length} request(s) waiting` : "No pending requests"}
            </p>
            <Link to="/leaves" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              My leave <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Scissors className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Service menu</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Read-only catalogue for the services you deliver.</p>
            <Link to="/services" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Browse services <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
