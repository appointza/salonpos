import type { LocationRes } from "@/model/locations";
import type { OrganizationRes } from "@/model/organizations";
import { distanceKm } from "@/pages/Login/customer-session";
import { resolveLocationCoords } from "@/pages/Nearby/nearby-geo";
import { toRow } from "@/entity-row";
import type { Row } from "@/store";
import { locationService } from "@/services/location.service";
import { organizationService } from "@/services/organization.service";
import { appointmentService } from "@/services/appointment.service";
import { serviceService } from "@/services/service.service";
import { staffService } from "@/services/staff.service";
import { shiftService } from "@/services/shift.service";
import type { OrgLocation, Tenant } from "@/tenant";

export type NearbyStudio = {
  org: Tenant;
  loc: OrgLocation;
  km: number;
  approximateDistance: boolean;
};

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
  return orgs
    .filter((o) => String(o.status ?? "Active") !== "Inactive")
    .map((o) => {
      const oid = o.orgId || o.id;
      return {
        orgId: oid,
        name: o.name,
        slug: o.slug,
        domain: o.domain,
        website: o.website,
        businessType: o.businessType,
        brandColor: o.brandColor,
        locations: locations
          .filter((l) => (l.orgId || 0) === oid && String(l.status ?? "Active") !== "Inactive")
          .map(locFromApi),
      };
    })
    .filter((t) => t.locations.length > 0);
}

export async function listNearbyStudios(userPos: { lat: number; lng: number }): Promise<NearbyStudio[]> {
  const [orgs, locations] = await Promise.all([
    organizationService.selectPublic({ status: "Active" }),
    locationService.selectPublic({ status: "Active" }),
  ]);

  return tenantsFromApi(orgs, locations)
    .flatMap((org) =>
      org.locations.map((loc) => {
        const coords = resolveLocationCoords(loc);
        return {
          org,
          loc,
          km: distanceKm(userPos, coords),
          approximateDistance: coords.approximate,
        };
      }),
    )
    .sort((a, b) => a.km - b.km);
}

export type OrgCatalog = {
  services: Row[];
  staff: Row[];
  appointments: Row[];
  shifts: Row[];
};

export async function loadOrgCatalog(orgId: number): Promise<OrgCatalog> {
  const [services, staff, appointments, shifts] = await Promise.all([
    serviceService.selectPublic({ orgId }),
    staffService.selectPublic({ orgId }),
    appointmentService.selectPublic({ orgId }),
    shiftService.selectPublic({ orgId }),
  ]);
  return {
    services: services.map((s) => toRow(s as Record<string, unknown>)),
    staff: staff.map((s) => toRow(s as Record<string, unknown>)),
    appointments: appointments.map((a) => toRow(a as Record<string, unknown>)),
    shifts: shifts.map((s) => toRow(s as Record<string, unknown>)),
  };
}
