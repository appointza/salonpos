import type { EntityId } from "@/ids";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/auth";
import { locationService } from "@/services/location.service";
import { organizationService } from "@/services/organization.service";
import type { LocationRes } from "@/model/locations";
import type { OrganizationRes } from "@/model/organizations";
import { authTokenStore } from "@/utils/auth-token.util";

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

/** Public URL segment: stored slug, or a slug from the salon name. */
export function publicSlug(org: { slug?: string; name?: string }) {
  return slugify(org.slug || "") || slugify(org.name || "");
}

export function matchTenantBySlug(tenants: Tenant[], slug: string) {
  const want = slugify(slug);
  if (!want) return undefined;
  return tenants.find((t) => publicSlug(t) === want);
}

function orgKey(o: { orgId?: number; id?: number }) {
  const oid = Number(o.orgId);
  if (oid > 0) return oid;
  return Number(o.id) || 0;
}

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
  const list = Array.isArray(orgs) ? orgs : [];
  const locs = Array.isArray(locations) ? locations : [];
  return list.map((o) => {
    const oid = orgKey(o);
    return {
      orgId: oid,
      name: o.name,
      slug: publicSlug(o),
      domain: o.domain,
      website: o.website,
      businessType: o.businessType,
      brandColor: o.brandColor,
      locations: locs.filter((l) => Number(l.orgId) === oid).map(locFromApi),
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
  ensureTenantBySlug: (slug: string) => Promise<Tenant | null>;
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
      const token = Boolean(authTokenStore.getAccessToken());
      const uid = Number(user?.orgId);
      const scoped = token && user?.role !== "SUPER_ADMIN" && uid > 0;
      const req = scoped ? { orgId: uid } : token ? {} : { status: "Active" };
      const loadOrgs = token ? organizationService.select.bind(organizationService) : organizationService.selectPublic.bind(organizationService);
      const loadLocs = token ? locationService.select.bind(locationService) : locationService.selectPublic.bind(locationService);

      let [orgs, locations] = await Promise.all([loadOrgs(req), loadLocs(req)]);
      if (!Array.isArray(orgs)) orgs = [];
      if (!Array.isArray(locations)) locations = [];

      if (token && orgs.length === 0 && scoped) {
        orgs = await organizationService.select({});
        if (!Array.isArray(orgs)) orgs = [];
        locations = await locationService.select({});
        if (!Array.isArray(locations)) locations = [];
      }

      if (scoped && orgs.length > 0) {
        const mine = orgs.filter((o) => orgKey(o) === uid || Number(o.id) === uid);
        if (mine.length) {
          orgs = mine;
          locations = locations.filter(
            (l) => Number(l.orgId) === uid || mine.some((o) => Number(l.orgId) === orgKey(o) || Number(l.orgId) === Number(o.id)),
          );
        }
      }

      setApiTenants(tenantsFromApi(orgs, locations));
    } catch (e) {
      setApiTenants([]);
      setError(e instanceof Error ? e.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [user?.orgId, user?.role]);

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

  const org = useMemo(() => {
    const want = pinnedOrgId || orgId;
    return (
      tenants.find((t) => t.orgId === want) ??
      tenants.find((t) => t.orgId === Number(user?.orgId)) ??
      tenants[0] ??
      EMPTY_TENANT
    );
  }, [tenants, orgId, pinnedOrgId, user?.orgId]);

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

  const ensureTenantBySlug = useCallback(
    async (slug: string): Promise<Tenant | null> => {
      const want = slugify(slug);
      if (!want) return null;
      const existing = matchTenantBySlug(tenants, slug);
      if (existing) return existing;
      try {
        let orgs = await organizationService.selectPublic({ slug });
        if (!orgs.length) orgs = await organizationService.selectPublic({});
        const hit = orgs.find((o) => publicSlug(o) === want);
        if (!hit) return null;
        const oid = hit.orgId || hit.id;
        const locations = await locationService.selectPublic({ orgId: oid, status: "Active" });
        const tenant = tenantsFromApi([hit], locations)[0];
        if (!tenant) return null;
        upsertTenant(tenant);
        return tenant;
      } catch {
        return null;
      }
    },
    [tenants, upsertTenant],
  );

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
      ensureTenantBySlug,
      scopeLabel: location ? location.name : "All outlets",
      loading,
      error,
    }),
    [tenants, org, location, locationId, setOrgId, setLocationId, upsertTenant, reloadTenants, ensureTenantBySlug, loading, error],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
