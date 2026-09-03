import { useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ROLE_NAV, useAuth, type Role, type SessionUser } from "@/lib/auth";
import { navSections } from "@/lib/modules";
import { useData, type Row } from "@/lib/store";

export const PERMISSION_SCREENS = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, group: section.label })),
);

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

export function permissionSummary(row: Row) {
  const view = splitPaths(row["view"]);
  const edit = splitPaths(row["edit"]);
  if (view === "all" && edit === "all") return "View & edit all screens";
  const v = view === "all" ? PERMISSION_SCREENS.length : view.length;
  const e = edit === "all" ? PERMISSION_SCREENS.length : edit.length;
  return `View ${v} · Edit ${e}`;
}

export function resolveWorkspaceRole(roles: Row[], users: Row[], user: SessionUser | null): Row | null {
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

export function usePermissions() {
  const { user } = useAuth();
  const { db } = useData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const roleRow = useMemo(
    () => resolveWorkspaceRole(db["roles"] ?? [], db["users"] ?? [], user),
    [db, user],
  );

  const view = roleRow ? splitPaths(roleRow["view"]) : user ? fallbackNav(user.role) : "all";
  const edit = roleRow ? splitPaths(roleRow["edit"]) : user?.role === "STYLIST" ? ["/appointments"] : view;

  return {
    roleRow,
    canView: (path: string) => hasPath(view, path),
    canEdit: (path: string) => hasPath(edit, path),
    allowedNav: view,
    canEditHere: hasPath(edit, pathname),
    canViewHere: hasPath(view, pathname),
  };
}
