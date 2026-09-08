import type { Row } from "@/lib/store";
import { normalizePhone } from "@/lib/customers/customer-lookup";

export { normalizePhone, findCustomerByPhone } from "@/lib/customers/customer-lookup";

export const DEMO_OTP = "123456";
export const QR_CHECKINS = "qrCheckins";
export const WHEEL_SEGMENTS = "wheelSegments";
export const QR_OFFERS = "qrOffers";

export function referralCodeFor(name: string, phone: string) {
  const stem = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "LUXE";
  return `${stem}${normalizePhone(phone).slice(-4)}`;
}

export function isBirthdayWindow(date: string, withinDays = 7) {
  if (!date) return false;
  const now = new Date();
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return false;
  const next = new Date(now.getFullYear(), m - 1, d);
  if (Number.isNaN(next.getTime())) return false;
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  const diff = (next.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= withinDays;
}

export function activePrograms(loyalty: Row[], locationId: string) {
  return loyalty.filter((p) => {
    if (String(p["status"]) !== "Active") return false;
    if (String(p["qrEnabled"] ?? "Yes") === "No") return false;
    const loc = String(p["locationId"] ?? "");
    return !loc || loc === locationId || loc === "all";
  });
}

export function programOfType(programs: Row[], type: string) {
  return programs.find((p) => String(p["type"]) === type) ?? null;
}

export function pickWheelSegment(segments: Row[]) {
  const active = segments.filter((s) => String(s["active"] ?? "Yes") !== "No");
  if (active.length === 0) return null;
  const total = active.reduce((sum, s) => sum + Math.max(0, Number(s["winWeight"] ?? 1)), 0);
  let roll = Math.random() * (total || 1);
  for (const seg of active) {
    roll -= Math.max(0, Number(seg["winWeight"] ?? 1));
    if (roll <= 0) return seg;
  }
  return active[active.length - 1] ?? null;
}

export function publicSiteUrl(origin: string, slug: string, locationId?: string) {
  const base = `${origin.replace(/\/$/, "")}/${slug}`;
  if (locationId && locationId !== "all") return `${base}?loc=${encodeURIComponent(locationId)}`;
  return base;
}

export function qrLandingUrl(origin: string, slug: string, locationId?: string) {
  return publicSiteUrl(origin, slug, locationId);
}

export function waCatalogLink(phone: string, outlet: string, lines: string[]) {
  const digits = phone.replace(/\D/g, "");
  const text = [`Hi ${outlet}, I'd like to order:`, ...lines.map((l) => `• ${l}`), "", "Pay at venue."].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
