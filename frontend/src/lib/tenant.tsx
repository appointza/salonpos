import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import seed from "@/data/salonData.json";
import { useAuth } from "@/lib/auth";

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
  placeId?: string;
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

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function locFromRow(l: (typeof seed.locations)[number]): OrgLocation {
  return {
    locationId: l.locationId,
    name: l.name,
    code: l.code,
    city: l.city,
    address: l.address,
    phone: l.phone,
    email: l.email,
    timezone: l.timezone,
    status: l.status,
    lat: l.lat,
    lng: l.lng,
    placeId: "placeId" in l ? String(l.placeId ?? "") : "",
  };
}

export function tenantsFromSeed(): Tenant[] {
  return seed.organizations.map((o) => ({
    orgId: o.orgId,
    name: o.name,
    slug: o.slug,
    domain: o.domain,
    website: o.website,
    businessType: o.businessType,
    brandColor: o.brandColor,
    locations: seed.locations.filter((l) => l.orgId === o.orgId).map(locFromRow),
  }));
}

type Ctx = {
  tenants: Tenant[];
  org: Tenant;
  location: OrgLocation | null;
  orgId: string;
  locationId: string; // "all" means every location of the org
  setOrgId: (id: string) => void;
  setLocationId: (id: string) => void;
  upsertTenant: (tenant: Tenant) => void;
  scopeLabel: string;
};

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [registered, setRegistered] = useState<Tenant[]>([]);
  const [orgId, setOrg] = useState<string>(DEMO_ORG_ID);
  const [locationId, setLocation] = useState<string>("all");

  const pinnedOrgId = user && user.role !== "SUPER_ADMIN" && user.orgId ? user.orgId : null;
  const pinnedLocationId = user?.role === "STYLIST" && user.locationId ? user.locationId : null;

  const tenants = useMemo(() => {
    const seeded = tenantsFromSeed();
    const seen = new Set(seeded.map((t) => t.orgId));
    return [...seeded, ...registered.filter((t) => !seen.has(t.orgId))];
  }, [registered]);

  useEffect(() => {
    if (pinnedOrgId) setOrg(pinnedOrgId);
  }, [pinnedOrgId]);

  useEffect(() => {
    if (pinnedLocationId) setLocation(pinnedLocationId);
  }, [pinnedLocationId]);

  const org = useMemo(() => tenants.find((t) => t.orgId === orgId) ?? tenants[0]!, [tenants, orgId]);

  const setOrgId = useCallback(
    (id: string) => {
      if (pinnedOrgId) return;
      setOrg(id);
      setLocation("all");
    },
    [pinnedOrgId],
  );

  const setLocationId = useCallback(
    (id: string) => {
      if (pinnedLocationId) return;
      setLocation(id);
    },
    [pinnedLocationId],
  );

  const upsertTenant = useCallback((tenant: Tenant) => {
    setRegistered((prev) => [...prev.filter((t) => t.orgId !== tenant.orgId), tenant]);
    setOrg(tenant.orgId);
    setLocation("all");
  }, []);

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
      upsertTenant,
      scopeLabel: location ? location.name : "All locations",
    }),
    [tenants, org, location, locationId, setOrgId, setLocationId, upsertTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
