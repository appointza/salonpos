import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type OrgLocation = {
  locationId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: string;
  lat: number;
  lng: number;
};

export type Tenant = {
  orgId: string;
  name: string;
  /** Public booking URL segment: https://<host>/<slug> */
  slug: string;
  domain: string;
  website: string;
  businessType: string;
  brandColor: string;
  locations: OrgLocation[];
};

export const DEMO_ORG_ID = "org-7f3a1c20-salon";

const DEMO_TENANTS: Tenant[] = [
  {
    orgId: DEMO_ORG_ID,
    name: "Luxe Salon Group",
    slug: "luxe-salon-group",
    domain: "luxesalon.in",
    website: "https://www.luxesalon.in",
    businessType: "Salon & Spa",
    brandColor: "#2f5bff",
    locations: [
      {
        locationId: "loc-bandra",
        lat: 19.0596,
        lng: 72.8295,
        name: "Bandra Flagship",
        code: "MUM-BAN",
        city: "Mumbai",
        address: "Linking Road, Bandra West, Mumbai 400050",
        phone: "+91 22 4000 1100",
        email: "bandra@luxesalon.in",
        timezone: "Asia/Kolkata",
        status: "Active",
      },
      {
        locationId: "loc-koregaon",
        lat: 18.5362,
        lng: 73.8939,
        name: "Koregaon Park",
        code: "PUN-KPK",
        city: "Pune",
        address: "North Main Road, Koregaon Park, Pune 411001",
        phone: "+91 20 4100 2200",
        email: "pune@luxesalon.in",
        timezone: "Asia/Kolkata",
        status: "Active",
      },
      {
        locationId: "loc-indiranagar",
        lat: 12.9784,
        lng: 77.6408,
        name: "Indiranagar",
        code: "BLR-IND",
        city: "Bengaluru",
        address: "100 Feet Road, Indiranagar, Bengaluru 560038",
        phone: "+91 80 4200 3300",
        email: "blr@luxesalon.in",
        timezone: "Asia/Kolkata",
        status: "Active",
      },
      {
        locationId: "loc-saltlake",
        lat: 22.5786,
        lng: 88.4337,
        name: "Salt Lake",
        code: "CCU-SLK",
        city: "Kolkata",
        address: "Sector V, Salt Lake, Kolkata 700091",
        phone: "+91 33 4300 4400",
        email: "kolkata@luxesalon.in",
        timezone: "Asia/Kolkata",
        status: "Active",
      },
    ],
  },
  {
    orgId: "org-b41d99e8-glow",
    name: "Glow & Co Studios",
    slug: "glow-and-co-studios",
    domain: "glowandco.co",
    website: "https://glowandco.co",
    businessType: "Beauty Studio",
    brandColor: "#0f9d8a",
    locations: [
      {
        locationId: "loc-glow-hq",
        lat: 18.9218,
        lng: 72.8347,
        name: "Colaba Studio",
        code: "MUM-COL",
        city: "Mumbai",
        address: "Causeway, Colaba, Mumbai 400005",
        phone: "+91 22 4700 8800",
        email: "colaba@glowandco.co",
        timezone: "Asia/Kolkata",
        status: "Active",
      },
      {
        locationId: "loc-glow-gur",
        lat: 28.4949,
        lng: 77.0895,
        name: "Cyber Hub",
        code: "DEL-CYB",
        city: "Gurugram",
        address: "DLF Cyber Hub, Gurugram 122002",
        phone: "+91 124 470 9900",
        email: "gurugram@glowandco.co",
        timezone: "Asia/Kolkata",
        status: "Onboarding",
      },
    ],
  },
];

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const ORGS_KEY = "salon-crm-orgs-v1";
const SELECTION_KEY = "salon-crm-tenant-selection-v1";

type StoredOrg = {
  orgId: string;
  name: string;
  businessType?: string;
  profile?: Record<string, string>;
  address?: Record<string, string>;
  outlet?: Record<string, string>;
};

function fromStoredOrgs(): Tenant[] {
  try {
    const raw = window.localStorage.getItem(ORGS_KEY);
    if (!raw) return [];
    const orgs = JSON.parse(raw) as StoredOrg[];
    return orgs.map((o) => ({
      orgId: o.orgId,
      name: o.name,
      slug: o.profile?.["slug"] || slugify(o.name),
      domain: o.profile?.["domain"] ?? "",
      website: o.profile?.["website"] ?? "",
      businessType: o.businessType ?? "Business",
      brandColor: o.profile?.["brandColor"] ?? "#2f5bff",
      locations: [
        {
          locationId: `loc-${o.orgId.slice(0, 8)}`,
          name: o.outlet?.["name"] || `${o.name} — Main`,
          code: "MAIN",
          city: o.address?.["city"] ?? "",
          address: o.outlet?.["address"] || o.address?.["line"] || "",
          phone: o.outlet?.["phone"] || o.profile?.["phone"] || "",
          email: o.outlet?.["email"] || o.profile?.["email"] || "",
          timezone: "Asia/Kolkata",
          status: o.outlet?.["status"] ?? "Active",
          lat: Number(o.address?.["lat"] ?? 0),
          lng: Number(o.address?.["lng"] ?? 0),
        },
      ],
    }));
  } catch {
    return [];
  }
}

type Ctx = {
  tenants: Tenant[];
  org: Tenant;
  location: OrgLocation | null;
  orgId: string;
  locationId: string; // "all" means every location of the org
  setOrgId: (id: string) => void;
  setLocationId: (id: string) => void;
  scopeLabel: string;
};

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<Tenant[]>([]);
  const [orgId, setOrg] = useState<string>(DEMO_ORG_ID);
  const [locationId, setLocation] = useState<string>("all");

  useEffect(() => {
    setExtra(fromStoredOrgs());
    try {
      const raw = window.localStorage.getItem(SELECTION_KEY);
      if (raw) {
        const sel = JSON.parse(raw) as { orgId: string; locationId: string };
        if (sel.orgId) setOrg(sel.orgId);
        if (sel.locationId) setLocation(sel.locationId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const tenants = useMemo(() => {
    const seen = new Set(DEMO_TENANTS.map((t) => t.orgId));
    return [...DEMO_TENANTS, ...extra.filter((t) => !seen.has(t.orgId))];
  }, [extra]);

  const org = useMemo(() => tenants.find((t) => t.orgId === orgId) ?? tenants[0]!, [tenants, orgId]);

  const persist = useCallback((next: { orgId: string; locationId: string }) => {
    try {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setOrgId = useCallback(
    (id: string) => {
      setOrg(id);
      setLocation("all");
      persist({ orgId: id, locationId: "all" });
    },
    [persist],
  );

  const setLocationId = useCallback(
    (id: string) => {
      setLocation(id);
      persist({ orgId, locationId: id });
    },
    [orgId, persist],
  );

  const location = useMemo(
    () => org.locations.find((l) => l.locationId === locationId) ?? null,
    [org, locationId],
  );

  const value = useMemo<Ctx>(
    () => ({
      tenants,
      org,
      location,
      orgId: org.orgId,
      locationId,
      setOrgId,
      setLocationId,
      scopeLabel: location ? location.name : "All locations",
    }),
    [tenants, org, location, locationId, setOrgId, setLocationId],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
