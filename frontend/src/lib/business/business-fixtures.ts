import type { Row } from "@/lib/store";

/** Canonical fixture data — keep in sync with bussines.md § Test fixtures. */
export const FIXTURE_ORG_ID = 1;
export const FIXTURE_OUTLET_A = 10;
export const FIXTURE_OUTLET_B = 11;
export const FIXTURE_PHONE = "9876543210";

export const fixtureCustomers: Row[] = [
  {
    id: 101,
    orgId: FIXTURE_ORG_ID,
    locationId: FIXTURE_OUTLET_A,
    name: "Priya Sharma",
    phone: FIXTURE_PHONE,
    outlet: "Main Outlet",
    tier: "Gold",
    points: 120,
    walletBalance: 500,
  },
  {
    id: 102,
    orgId: FIXTURE_ORG_ID,
    locationId: FIXTURE_OUTLET_B,
    name: "Priya S.",
    phone: FIXTURE_PHONE,
    outlet: "City Branch",
    tier: "Silver",
    points: 40,
    walletBalance: 0,
  },
  {
    id: 201,
    orgId: 2,
    locationId: 20,
    name: "Other Org Guest",
    phone: FIXTURE_PHONE,
    outlet: "Remote",
    tier: "Silver",
    points: 0,
    walletBalance: 0,
  },
];

export const fixtureFranchises: Row[] = [
  { id: 1, orgId: FIXTURE_ORG_ID, locationId: FIXTURE_OUTLET_A, name: "Main Outlet", status: "Active" },
  { id: 2, orgId: FIXTURE_ORG_ID, locationId: FIXTURE_OUTLET_B, name: "City Branch", status: "Active" },
];
