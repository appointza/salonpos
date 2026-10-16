import { publicSlug } from "@/tenant";

export function parseReferralSearch(search: Record<string, unknown>) {
  for (const key of ["ref", "coupon", "code", "referral"] as const) {
    const value = search[key];
    if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
  }
  return undefined;
}

export function publicSalonBookingUrl(input: {
  slug: string;
  code?: string;
  locationId?: string | number;
  walkIn?: boolean;
  origin?: string;
}) {
  const slug = String(input.slug ?? "").replace(/^\/+|\/+$/g, "");
  if (!slug) return "";
  const origin = (input.origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  const path = input.walkIn ? `/${slug}/walk-in` : `/${slug}`;
  const q = new URLSearchParams();
  if (input.locationId !== undefined && input.locationId !== "" && String(input.locationId) !== "0") {
    q.set("loc", String(input.locationId));
  }
  const code = String(input.code ?? "").trim().toUpperCase();
  if (code) q.set("ref", code);
  const qs = q.toString();
  return `${origin}${path}${qs ? `?${qs}` : ""}`;
}

export function orgPublicSlug(org: { slug?: unknown; name?: unknown } | null | undefined) {
  if (!org) return "";
  return publicSlug({ slug: String(org.slug ?? ""), name: String(org.name ?? "") });
}
