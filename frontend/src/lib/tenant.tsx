import type { EntityId } from "@/lib/ids";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { locationService } from "@/services/location.service";
import { organizationService } from "@/services/organization.service";
import type { LocationRes } from "@/model/locations";
import type { OrganizationRes } from "@/model/organizations";

export type OrgLocation = {
  locationId: number;
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
  orgId: number;
  name: string;
  slug: string;
  domain: string;
  website: string;
  businessType: string;
  brandColor: string;
  locations: OrgLocation[];
};

export const EMPTY_TENANT: Tenant = {
  orgId: 0,
  name: "No organization",
  slug: "",
  domain: "",
  website: "",
  businessType: "",
  brandColor: "#2f5bff",
  locations: [],
};

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function locFromApi(l: LocationRes): OrgLocation {
  return {
    locationId: l.locationId || l.id,
    name: l.name,
    code: l.code,
    city: l.city,
    address: l.address,
    phone: l.phone,
    email: l.email,
    timezone: l.timezone,
    status: l.status,
    lat: Number(l.lat),
    lng: Number(l.lng),
    placeId: l.placeId,
  };
}

function tenantsFromApi(orgs: OrganizationRes[], locations: LocationRes[]): Tenant[] {
  return orgs.map((o) => {
    const oid = o.orgId || o.id;
    return {
      orgId: oid,
      name: o.name,
      slug: o.slug,
      domain: o.domain,
      website: o.website,
      businessType: o.businessType,
      brandColor: o.brandColor,
      locations: locations.filter((l) => (l.orgId || 0) === oid).map(locFromApi),
    };
  });
}

type Ctx = {
  tenants: Tenant[];
  org: Tenant;
  location: OrgLocation | null;
  orgId: number;
  locationId: EntityId | number;
  setOrgId: (id: number) => void;
  setLocationId: (id: string | number) => void;
  upsertTenant: (tenant: Tenant) => void;
  reloadTenants: () => Promise<void>;
  scopeLabel: string;
  loading: boolean;
  error: string | null;
};

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [apiTenants, setApiTenants] = useState<Tenant[]>([]);
  const [registered, setRegistered] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrg] = useState<number>(0);
  const [locationId, setLocation] = useState<string>("all");

  const pinnedOrgId = user && user.role !== "SUPER_ADMIN" && user.orgId ? Number(user.orgId) : null;
  const pinnedLocationId = user?.role === "STYLIST" && user.locationId ? user.locationId : null;

  const reloadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgs, locations] = await Promise.all([
        organizationService.select({}),
        locationService.select({}),
      ]);
      setApiTenants(tenantsFromApi(orgs, locations));
    } catch (e) {
      setApiTenants([]);
      setError(e instanceof Error ? e.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadTenants();
  }, [reloadTenants]);

  const tenants = useMemo(() => {
    const seen = new Set(apiTenants.map((t) => t.orgId));
    return [...apiTenants, ...registered.filter((t) => !seen.has(t.orgId))];
  }, [apiTenants, registered]);

  useEffect(() => {
    if (pinnedOrgId) {
      setOrg(pinnedOrgId);
      return;
    }
    if (!orgId && tenants.length > 0) {
      setOrg(tenants[0].orgId);
    }
  }, [pinnedOrgId, orgId, tenants]);

  useEffect(() => {
    if (pinnedLocationId) setLocation(String(pinnedLocationId));
  }, [pinnedLocationId]);

  const org = useMemo(() => tenants.find((t) => t.orgId === orgId) ?? tenants[0] ?? EMPTY_TENANT, [tenants, orgId]);

  const setOrgId = useCallback(
    (id: number) => {
      if (pinnedOrgId) return;
      setOrg(id);
      setLocation("all");
    },
    [pinnedOrgId],
  );

  const setLocationId = useCallback(
    (id: string | number) => {
      if (pinnedLocationId) return;
      setLocation(String(id));
    },
    [pinnedLocationId],
  );

  const upsertTenant = useCallback((tenant: Tenant) => {
    setRegistered((prev) => [...prev.filter((t) => t.orgId !== tenant.orgId), tenant]);
    setApiTenants((prev) => {
      const seen = new Set(prev.map((t) => t.orgId));
      if (seen.has(tenant.orgId)) {
        return prev.map((t) => (t.orgId === tenant.orgId ? tenant : t));
      }
      return [...prev, tenant];
    });
    setOrg(tenant.orgId);
    setLocation("all");
  }, []);

  const location = useMemo(
    () => org.locations.find((l) => String(l.locationId) === String(locationId)) ?? null,
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
      reloadTenants,
      scopeLabel: location ? location.name : "All outlets",
      loading,
      error,
    }),
    [tenants, org, location, locationId, setOrgId, setLocationId, upsertTenant, reloadTenants, loading, error],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
