import { ROLE_NAV } from "@/lib/auth";
import type { Row } from "@/lib/store";

function joinPaths(paths: string[]) {
  return paths.join(",");
}

const receptionistPaths = [
  "/dashboard",
  "/front-desk",
  "/customers",
  "/appointments",
  "/pos",
  "/walk-in",
  "/services",
  "/feedback",
];

/** Default workspace roles seeded for each new organization. */
export function defaultRoleRows(orgId: number, locationId = 0): Row[] {
  const staffPaths = joinPaths(ROLE_NAV.STAFF as string[]);
  const stylistPaths = joinPaths(ROLE_NAV.STYLIST as string[]);
  const receptionist = joinPaths(receptionistPaths);

  return [
    {
      id: 0,
      orgId,
      locationId,
      name: "Owner",
      code: "ADMIN",
      description: "Full access to all screens and settings.",
      builtIn: "Yes",
      view: "all",
      edit: "all",
      status: "Active",
    },
    {
      id: 0,
      orgId,
      locationId,
      name: "Outlet Manager",
      code: "STAFF",
      description: "Run day-to-day outlet operations.",
      builtIn: "Yes",
      view: staffPaths,
      edit: staffPaths,
      status: "Active",
    },
    {
      id: 0,
      orgId,
      locationId,
      name: "Stylist",
      code: "STYLIST",
      description: "Own schedule, appointments and clients.",
      builtIn: "Yes",
      view: stylistPaths,
      edit: stylistPaths,
      status: "Active",
    },
    {
      id: 0,
      orgId,
      locationId,
      name: "Receptionist",
      code: "STAFF",
      description: "Front desk, bookings and walk-ins.",
      builtIn: "Yes",
      view: receptionist,
      edit: receptionist,
      status: "Active",
    },
  ];
}

export function roleLabel(rows: Row[], storedRole: string | number | undefined) {
  const raw = String(storedRole ?? "");
  const byCode = rows.find((r) => String(r["code"]) === raw);
  if (byCode) return String(byCode["name"]);
  const byName = rows.find((r) => String(r["name"]).toLowerCase() === raw.toLowerCase());
  return byName ? String(byName["name"]) : raw || "—";
}

export function roleByStoredValue(rows: Row[], storedRole: string | number | undefined) {
  const raw = String(storedRole ?? "");
  return rows.find((r) => String(r["code"]) === raw || String(r["name"]).toLowerCase() === raw.toLowerCase());
}
