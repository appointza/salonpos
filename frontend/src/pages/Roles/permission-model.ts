import { ROLE_NAV, type Role, type SessionUser } from "@/auth";

export type PermRow = { id: string | number } & Record<string, string | number>;

export const PERMISSION_SCREENS = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", group: "Admin Overview" },
  { to: "/reports", label: "Reports", icon: "BarChart3", group: "Admin Overview" },
  { to: "/setup", label: "Easy setup", icon: "ListChecks", group: "Admin Overview" },
  { to: "/front-desk", label: "Front desk", icon: "UserRound", group: "Admin Overview" },
  { to: "/customers", label: "Customers", icon: "Users", group: "Front desk" },
  { to: "/appointments", label: "Appointments", icon: "CalendarDays", group: "Front desk" },
  { to: "/pos", label: "POS & Billing", icon: "Receipt", group: "Front desk" },
  { to: "/services", label: "Services", icon: "Scissors", group: "Front desk" },
  { to: "/feedback", label: "Feedback", icon: "MessageSquareHeart", group: "Front desk" },
  { to: "/inventory", label: "Inventory", icon: "Package", group: "Operations" },
  { to: "/vendors", label: "Vendors", icon: "Truck", group: "Operations" },
  { to: "/expenses", label: "Expenses", icon: "Wallet", group: "Operations" },
  { to: "/staff", label: "Staff", icon: "IdCard", group: "People" },
  { to: "/shifts", label: "Shifts", icon: "CalendarClock", group: "People" },
  { to: "/attendance", label: "Attendance", icon: "Clock", group: "People" },
  { to: "/leaves", label: "Leaves", icon: "PlaneTakeoff", group: "People" },
  { to: "/payroll", label: "Payroll", icon: "BadgeIndianRupee", group: "People" },
  { to: "/commissions", label: "Commissions", icon: "PiggyBank", group: "People" },
  { to: "/loyalty", label: "Loyalty", icon: "Gift", group: "Growth" },
  { to: "/offers", label: "Offers", icon: "TicketPercent", group: "Growth" },
  { to: "/coupons", label: "Coupon management", icon: "Ticket", group: "Growth" },
  { to: "/prize-wheel", label: "Prize wheel", icon: "Sparkles", group: "Growth" },
  { to: "/scratch-card", label: "Scratch card", icon: "Layers", group: "Growth" },
  { to: "/memberships", label: "Memberships", icon: "CreditCard", group: "Growth" },
  { to: "/walk-in", label: "Walk-in (public)", icon: "UserRound", group: "Growth" },
  { to: "/book", label: "Public booking site", icon: "Globe", group: "Growth" },
  { to: "/campaigns", label: "Campaigns", icon: "Megaphone", group: "CRM" },
  { to: "/franchises", label: "Outlets", icon: "Store", group: "Network" },
  { to: "/brand-apps", label: "White-Label Apps", icon: "Smartphone", group: "Network" },
  { to: "/users", label: "Users", icon: "ShieldCheck", group: "Network" },
  { to: "/roles", label: "Roles & permissions", icon: "Lock", group: "Network" },
  { to: "/subscription", label: "Subscription", icon: "CreditCard", group: "Network" },
  { to: "/settings", label: "Settings", icon: "Settings", group: "Network" },
];

export const COLLECTION_WRITE_SCREENS: Record<string, string[]> = {
  appointments: ["/appointments"],
  customers: ["/customers"],
  services: ["/services"],
  serviceProducts: ["/services"],
  invoices: ["/pos"],
  inventory: ["/inventory"],
  stockMovements: ["/inventory", "/pos"],
  expenses: ["/expenses"],
  vendors: ["/vendors", "/expenses", "/inventory"],
  staff: ["/staff"],
  shifts: ["/shifts"],
  attendance: ["/attendance"],
  leaves: ["/leaves"],
  payroll: ["/payroll"],
  commissions: ["/commissions", "/pos"],
  loyalty: ["/loyalty"],
  loyaltyTransactions: ["/loyalty", "/pos"],
  qrCheckins: ["/loyalty", "/walk-in"],
  wheelSegments: ["/prize-wheel"],
  scratchPrizes: ["/scratch-card"],
  scratchPlays: ["/scratch-card", "/pos", "/walk-in"],
  wheelSpins: ["/prize-wheel", "/pos", "/walk-in"],
  referenceValues: ["/settings"],
  qrOffers: ["/offers"],
  qrOfferRedemptions: ["/offers", "/pos"],
  coupons: ["/coupons"],
  couponUsage: ["/coupons", "/pos"],
  vouchers: ["/coupons", "/pos"],
  partnerships: ["/loyalty"],
  partnerCoupons: ["/loyalty", "/pos"],
  memberships: ["/memberships"],
  membershipPlans: ["/memberships"],
  membershipUsage: ["/memberships", "/pos"],
  campaigns: ["/campaigns"],
  whatsappMessages: ["/campaigns", "/settings"],
  whatsappTemplates: ["/campaigns"],
  feedback: ["/feedback"],
  googleReviews: ["/feedback"],
  franchises: ["/franchises"],
  brandApps: ["/brand-apps"],
  users: ["/users"],
  roles: ["/roles"],
  organizations: ["/settings"],
  locations: ["/settings"],
};

export function splitPaths(value: string | number | undefined): "all" | string[] {
  const s = String(value ?? "").trim();
  if (s === "all") return "all";
  if (!s) return [];
  return [...new Set(s.split(",").map((p) => p.trim()).filter(Boolean))];
}

export function joinPaths(paths: string[], isAll: boolean) {
  return isAll ? "all" : paths.join(",");
}

export function hasPath(list: "all" | string[], path: string) {
  if (list === "all") return true;
  return list.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

export function canMutateCollection(edit: "all" | string[], collection: string) {
  if (edit === "all") return true;
  const screens = COLLECTION_WRITE_SCREENS[collection] ?? [`/${collection}`];
  return screens.some((path) => hasPath(edit, path));
}

export function firstAllowedPath(view: "all" | string[]) {
  if (view === "all") return "/dashboard";
  if (view.includes("/dashboard")) return "/dashboard";
  return view[0] || "/dashboard";
}

export function isPermissionScreen(path: string) {
  return PERMISSION_SCREENS.some((s) => s.to === path);
}

export function permissionSummary(row: PermRow) {
  const view = splitPaths(row["view"]);
  const edit = splitPaths(row["edit"]);
  if (view === "all" && edit === "all") return "View & edit all screens";
  const v = view === "all" ? PERMISSION_SCREENS.length : view.length;
  const e = edit === "all" ? PERMISSION_SCREENS.length : edit.length;
  return `View ${v} · Edit ${e}`;
}

export function resolveWorkspaceRole(roles: PermRow[], users: PermRow[], user: SessionUser | null): PermRow | null {
  if (!user || user.role === "SUPER_ADMIN") return null;
  const email = user.email.trim().toLowerCase();
  const account = users.find((u) => String(u["email"] ?? "").trim().toLowerCase() === email);
  const byName = account
    ? roles.find((r) => String(r["name"]).toLowerCase() === String(account["role"] ?? "").toLowerCase())
    : null;
  if (byName) return byName;
  return roles.find((r) => String(r["code"]) === user.role) ?? null;
}

export function fallbackNav(role: Role): string[] | "all" {
  return ROLE_NAV[role];
}

export function editListForUser(
  roleRow: PermRow | null,
  user: SessionUser | null,
  view: "all" | string[],
): "all" | string[] {
  if (!user || user.role === "SUPER_ADMIN") return "all";
  if (roleRow) return splitPaths(roleRow["edit"]);
  if (user.role === "STYLIST") return ["/appointments"];
  return view;
}
