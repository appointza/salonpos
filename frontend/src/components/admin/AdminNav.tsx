import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  Gift,
  Globe,
  IdCard,
  LayoutDashboard,
  ListChecks,
  Lock,
  Megaphone,
  MessageSquareHeart,
  Package,
  PiggyBank,
  PlaneTakeoff,
  FileText,
  Receipt,
  Scissors,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Ticket,
  TicketPercent,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useT } from "@/i18n/LanguageContext";
import { publicSlug, useTenant } from "@/tenant";

type Allowed = "all" | string[];

function canSee(allowed: Allowed, path: string) {
  return allowed === "all" || allowed.includes(path);
}

function NavItem({
  to,
  label,
  icon,
  active,
  external,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  external?: boolean;
}) {
  const className = cn(
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    active && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={className}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {icon}
      {label}
    </Link>
  );
}

export function AdminNav({ allowed, onNavigate }: { allowed: Allowed; onNavigate?: () => void }) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { org } = useTenant();
  const slug = publicSlug(org);
  const walkInUrl = slug ? `/${slug}/walk-in` : "/walk-in";
  const bookingUrl = slug ? `/${slug}` : "/book";

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const wrap = (node: ReactNode) => (
    <li onClick={onNavigate} onKeyDown={onNavigate}>
      {node}
    </li>
  );

  return (
    <nav className="flex-1 space-y-5 px-3 pb-6">
      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("Admin Overview")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/dashboard")
            ? wrap(
                <NavItem
                  to="/dashboard"
                  label={t("Dashboard")}
                  icon={<LayoutDashboard className="size-4 shrink-0" />}
                  active={isActive("/dashboard")}
                />,
              )
            : null}
          {canSee(allowed, "/reports")
            ? wrap(
                <NavItem
                  to="/reports"
                  label={t("Reports")}
                  icon={<BarChart3 className="size-4 shrink-0" />}
                  active={isActive("/reports")}
                />,
              )
            : null}
          {canSee(allowed, "/setup")
            ? wrap(
                <NavItem
                  to="/setup"
                  label={t("Easy setup")}
                  icon={<ListChecks className="size-4 shrink-0" />}
                  active={isActive("/setup")}
                />,
              )
            : null}
          {canSee(allowed, "/front-desk")
            ? wrap(
                <NavItem
                  to="/front-desk"
                  label={t("Front desk")}
                  icon={<UserRound className="size-4 shrink-0" />}
                  active={isActive("/front-desk")}
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("Front desk")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/customers")
            ? wrap(
                <NavItem
                  to="/customers"
                  label={t("Customers")}
                  icon={<Users className="size-4 shrink-0" />}
                  active={isActive("/customers")}
                />,
              )
            : null}
          {canSee(allowed, "/appointments")
            ? wrap(
                <NavItem
                  to="/appointments"
                  label={t("Appointments")}
                  icon={<CalendarDays className="size-4 shrink-0" />}
                  active={isActive("/appointments")}
                />,
              )
            : null}
          {canSee(allowed, "/pos")
            ? wrap(
                <NavItem
                  to="/pos"
                  label={t("POS")}
                  icon={<Receipt className="size-4 shrink-0" />}
                  active={isActive("/pos")}
                />,
              )
            : null}
          {canSee(allowed, "/invoices")
            ? wrap(
                <NavItem
                  to="/invoices"
                  label={t("Invoices")}
                  icon={<FileText className="size-4 shrink-0" />}
                  active={isActive("/invoices")}
                />,
              )
            : null}
          {canSee(allowed, "/services")
            ? wrap(
                <NavItem
                  to="/services"
                  label={t("Services")}
                  icon={<Scissors className="size-4 shrink-0" />}
                  active={isActive("/services")}
                />,
              )
            : null}
          {canSee(allowed, "/feedback")
            ? wrap(
                <NavItem
                  to="/feedback"
                  label={t("Feedback")}
                  icon={<MessageSquareHeart className="size-4 shrink-0" />}
                  active={isActive("/feedback")}
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("Operations")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/inventory")
            ? wrap(
                <NavItem
                  to="/inventory"
                  label={t("Inventory")}
                  icon={<Package className="size-4 shrink-0" />}
                  active={isActive("/inventory")}
                />,
              )
            : null}
          {canSee(allowed, "/vendors")
            ? wrap(
                <NavItem
                  to="/vendors"
                  label={t("Vendors")}
                  icon={<Truck className="size-4 shrink-0" />}
                  active={isActive("/vendors")}
                />,
              )
            : null}
          {canSee(allowed, "/expenses")
            ? wrap(
                <NavItem
                  to="/expenses"
                  label={t("Expenses")}
                  icon={<Wallet className="size-4 shrink-0" />}
                  active={isActive("/expenses")}
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("People")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/staff")
            ? wrap(
                <NavItem to="/staff" label={t("Staff")} icon={<IdCard className="size-4 shrink-0" />} active={isActive("/staff")} />,
              )
            : null}
          {canSee(allowed, "/shifts")
            ? wrap(
                <NavItem
                  to="/shifts"
                  label={t("Shifts")}
                  icon={<CalendarClock className="size-4 shrink-0" />}
                  active={isActive("/shifts")}
                />,
              )
            : null}
          {canSee(allowed, "/attendance")
            ? wrap(
                <NavItem
                  to="/attendance"
                  label={t("Attendance")}
                  icon={<Clock className="size-4 shrink-0" />}
                  active={isActive("/attendance")}
                />,
              )
            : null}
          {canSee(allowed, "/leaves")
            ? wrap(
                <NavItem
                  to="/leaves"
                  label={t("Leaves")}
                  icon={<PlaneTakeoff className="size-4 shrink-0" />}
                  active={isActive("/leaves")}
                />,
              )
            : null}
          {canSee(allowed, "/payroll")
            ? wrap(
                <NavItem
                  to="/payroll"
                  label={t("Payroll")}
                  icon={<BadgeIndianRupee className="size-4 shrink-0" />}
                  active={isActive("/payroll")}
                />,
              )
            : null}
          {canSee(allowed, "/commissions")
            ? wrap(
                <NavItem
                  to="/commissions"
                  label={t("Commissions")}
                  icon={<PiggyBank className="size-4 shrink-0" />}
                  active={isActive("/commissions")}
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("Growth")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/growth")
            ? wrap(
                <NavItem
                  to="/growth/claim"
                  label={t("Claim points")}
                  icon={<Star className="size-4 shrink-0" />}
                  active={isActive("/growth")}
                />,
              )
            : null}
          {canSee(allowed, "/loyalty")
            ? wrap(
                <NavItem to="/loyalty" label={t("Loyalty")} icon={<Gift className="size-4 shrink-0" />} active={isActive("/loyalty")} />,
              )
            : null}
          {canSee(allowed, "/offers")
            ? wrap(
                <NavItem
                  to="/offers"
                  label={t("Offers")}
                  icon={<TicketPercent className="size-4 shrink-0" />}
                  active={isActive("/offers")}
                />,
              )
            : null}
          {canSee(allowed, "/coupons")
            ? wrap(
                <NavItem
                  to="/coupons"
                  label={t("Coupon management")}
                  icon={<Ticket className="size-4 shrink-0" />}
                  active={isActive("/coupons")}
                />,
              )
            : null}
          {canSee(allowed, "/prize-wheel") || canSee(allowed, "/scratch-card")
            ? wrap(
                <NavItem
                  to="/prize-wheel"
                  label={t("Guest prizes")}
                  icon={<Sparkles className="size-4 shrink-0" />}
                  active={isActive("/prize-wheel") || isActive("/scratch-card")}
                />,
              )
            : null}
          {canSee(allowed, "/memberships")
            ? wrap(
                <NavItem
                  to="/memberships"
                  label={t("Memberships")}
                  icon={<CreditCard className="size-4 shrink-0" />}
                  active={isActive("/memberships")}
                />,
              )
            : null}
          {canSee(allowed, "/walk-in")
            ? wrap(
                <NavItem
                  to={walkInUrl}
                  label={t("Walk-in (public)")}
                  icon={<UserRound className="size-4 shrink-0" />}
                  active={false}
                  external
                />,
              )
            : null}
          {canSee(allowed, "/book")
            ? wrap(
                <NavItem
                  to={bookingUrl}
                  label={t("Public booking site")}
                  icon={<Globe className="size-4 shrink-0" />}
                  active={false}
                  external
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("CRM")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/campaigns")
            ? wrap(
                <NavItem
                  to="/campaigns"
                  label={t("Campaigns")}
                  icon={<Megaphone className="size-4 shrink-0" />}
                  active={isActive("/campaigns")}
                />,
              )
            : null}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t("Network")}</p>
        <ul className="space-y-0.5">
          {canSee(allowed, "/franchises")
            ? wrap(
                <NavItem
                  to="/franchises"
                  label={t("Outlets")}
                  icon={<Store className="size-4 shrink-0" />}
                  active={isActive("/franchises")}
                />,
              )
            : null}
          {canSee(allowed, "/brand-apps")
            ? wrap(
                <NavItem
                  to="/brand-apps"
                  label={t("White-Label Apps")}
                  icon={<Smartphone className="size-4 shrink-0" />}
                  active={isActive("/brand-apps")}
                />,
              )
            : null}
          {canSee(allowed, "/users")
            ? wrap(
                <NavItem
                  to="/users"
                  label={t("Users")}
                  icon={<ShieldCheck className="size-4 shrink-0" />}
                  active={isActive("/users")}
                />,
              )
            : null}
          {canSee(allowed, "/roles")
            ? wrap(
                <NavItem
                  to="/roles"
                  label={t("Roles & permissions")}
                  icon={<Lock className="size-4 shrink-0" />}
                  active={isActive("/roles")}
                />,
              )
            : null}
          {canSee(allowed, "/subscription")
            ? wrap(
                <NavItem
                  to="/subscription"
                  label={t("Subscription")}
                  icon={<CreditCard className="size-4 shrink-0" />}
                  active={isActive("/subscription")}
                />,
              )
            : null}
          {canSee(allowed, "/settings")
            ? wrap(
                <NavItem
                  to="/settings"
                  label={t("Settings")}
                  icon={<Settings className="size-4 shrink-0" />}
                  active={isActive("/settings")}
                />,
              )
            : null}
        </ul>
      </div>
    </nav>
  );
}
