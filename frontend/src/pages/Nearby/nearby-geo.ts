import type { OrgLocation } from "@/tenant";

/** Fallback coordinates for distance sorting when a studio has no lat/lng yet. */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  "new delhi": { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  indore: { lat: 22.7196, lng: 75.8577 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  surat: { lat: 21.1702, lng: 72.8311 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  goa: { lat: 15.2993, lng: 74.124 },
  panaji: { lat: 15.4909, lng: 73.8278 },
};

export type ResolvedCoords = { lat: number; lng: number; approximate: boolean };

export function resolveLocationCoords(loc: OrgLocation): ResolvedCoords {
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng, approximate: false };
  }
  const cityKey = String(loc.city ?? "")
    .trim()
    .toLowerCase();
  const city = CITY_COORDS[cityKey];
  if (city) return { ...city, approximate: true };
  return { lat: 19.076, lng: 72.8777, approximate: true };
}
