export const DEFAULT_POS = { lat: 19.076, lng: 72.8777 };

export const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const today = () => new Date().toISOString().slice(0, 10);

export function formatDistance(km: number, approximate: boolean) {
  const label = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  return approximate ? `~${label}` : label;
}

const BOOKING_PICK_KEY = "nearby-booking-pick-v1";

export type BookingPick = { orgId: number; locationId: number };

export function saveBookingPick(pick: BookingPick) {
  try {
    sessionStorage.setItem(BOOKING_PICK_KEY, JSON.stringify(pick));
  } catch {
    /* ignore */
  }
}

export function readBookingPick(): BookingPick | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_PICK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingPick;
    if (!parsed.orgId || !parsed.locationId) return null;
    return parsed;
  } catch {
    return null;
  }
}
