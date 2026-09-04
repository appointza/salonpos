import { ROLE_NAV, type Role, type SessionUser } from "@/lib/auth";
import { navSections } from "@/lib/modules";

export type PermRow = { id: string | number } & Record<string, string | number>;

export const PERMISSION_SCREENS = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, group: section.label })),
);

export const COLLECTION_WRITE_SCREENS: Record<string, string[]> = {
  appointments: ["/appointments"],
  customers: ["/customers"],
  services: ["/services"],
  serviceProducts: ["/services"],
  invoices: ["/pos"],
  inventory: ["/inventory"],
  stockMovements: ["/inventory", "/pos"],
  expenses: ["/expenses"],
  staff: ["/staff"],
  shifts: ["/shifts"],
  attendance: ["/attendance"],
  leaves: ["/leaves"],
  payroll: ["/payroll"],
  commissions: ["/commissions", "/pos"],
  loyalty: ["/loyalty"],
  loyaltyTransactions: ["/loyalty", "/pos"],
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
  return list === "all" || list.includes(path);
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
