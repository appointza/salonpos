import type { Row } from "@/lib/store";

export type GoogleReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  relativeTime: string;
  outlet: string;
  locationId: string;
  live: boolean;
};

export type GooglePlaceSummary = {
  placeId: string;
  locationId: string;
  outlet: string;
  rating: number;
  reviewCount: number;
  mapsUrl: string;
  source: "google" | "demo";
  syncedAt: string;
  stale: boolean;
  reviews: GoogleReview[];
};

/** Pull from Google at most this often unless the user clicks Refresh. */
export const GOOGLE_SYNC_STALE_MS = 6 * 60 * 60 * 1000;

type MapsPlaceReview = {
  author_name?: string;
  rating?: number;
  text?: string;
  relative_time_description?: string;
};

type MapsPlaceResult = {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  url?: string;
  reviews?: MapsPlaceReview[];
};

type MapsPlacesNs = {
  PlacesService: new (el: HTMLElement) => {
    getDetails: (
      req: { placeId: string; fields: string[] },
      cb: (result: MapsPlaceResult | null, status: string) => void,
    ) => void;
  };
  PlacesServiceStatus: { OK: string };
};

declare global {
  interface Window {
    google?: { maps?: { places?: MapsPlacesNs } };
  }
}

export function mapsApiKey() {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
}

export function locationPlaceId(row: Row) {
  return String(row["placeId"] ?? "").trim();
}

export function mapsListingUrl(row: Row) {
  const placeId = locationPlaceId(row);
  if (placeId) return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
  const lat = Number(row["lat"] ?? 0);
  const lng = Number(row["lng"] ?? 0);
  if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const q = [row["name"], row["address"], row["city"]].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function reviewsFromSeed(rows: Row[], locationId: string): GoogleReview[] {
  return rows
    .filter((r) => !locationId || locationId === "all" || String(r["locationId"]) === locationId)
    .map((r) => ({
      id: String(r.id),
      author: String(r["author"] ?? "Google user"),
      rating: Number(r["rating"] ?? 0),
      comment: String(r["comment"] ?? ""),
      relativeTime: String(r["relativeTime"] ?? r["date"] ?? ""),
      outlet: String(r["outlet"] ?? ""),
      locationId: String(r["locationId"] ?? ""),
      live: false,
    }));
}

export function locationSyncedAt(row: Row) {
  return String(row["googleSyncedAt"] ?? "").trim();
}

export function isGoogleSyncStale(syncedAt: string, now = Date.now()) {
  if (!syncedAt) return true;
  const t = Date.parse(syncedAt);
  return Number.isNaN(t) || now - t >= GOOGLE_SYNC_STALE_MS;
}

export function formatSyncedAgo(syncedAt: string, now = Date.now()) {
  if (!syncedAt) return "Never synced";
  const t = Date.parse(syncedAt);
  if (Number.isNaN(t)) return "Never synced";
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  return `Updated ${Math.round(hours / 24)}d ago`;
}

export function summaryFromStore(location: Row, stored: Row[]): GooglePlaceSummary {
  const locationId = String(location["locationId"] ?? location.id);
  const reviews = reviewsFromSeed(stored, locationId);
  const storedRating = Number(location["googleRating"] ?? 0);
  const storedCount = Number(location["googleReviewCount"] ?? 0);
  const avg = storedRating || (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
  const source = String(location["googleSyncSource"] ?? "demo") === "google" ? "google" : "demo";
  const syncedAt = locationSyncedAt(location);
  return {
    placeId: locationPlaceId(location),
    locationId,
    outlet: String(location["name"] ?? ""),
    rating: Math.round(avg * 10) / 10,
    reviewCount: storedCount || reviews.length,
    mapsUrl: String(location["googleMapsUrl"] ?? "") || mapsListingUrl(location),
    source,
    syncedAt,
    stale: isGoogleSyncStale(syncedAt),
    reviews,
  };
}

export function reviewRowsFromLive(
  location: Row,
  reviews: Omit<GoogleReview, "outlet" | "locationId">[],
): Row[] {
  const locationId = String(location["locationId"] ?? location.id);
  const outlet = String(location["name"] ?? "");
  const today = new Date().toISOString().slice(0, 10);
  return reviews.map((r, i) => ({
    id: r.id || `GR-${locationId}-${i}`,
    outlet,
    locationId,
    author: r.author,
    rating: r.rating,
    comment: r.comment,
    relativeTime: r.relativeTime,
    date: today,
    source: "Google",
  }));
}

export function locationSyncMeta(input: {
  rating: number;
  reviewCount: number;
  mapsUrl: string;
  source: "google" | "demo";
}): Record<string, string | number> {
  return {
    googleRating: input.rating,
    googleReviewCount: input.reviewCount,
    googleSyncedAt: new Date().toISOString(),
    googleMapsUrl: input.mapsUrl,
    googleSyncSource: input.source,
  };
}

let mapsLoader: Promise<MapsPlacesNs> | null = null;

function loadPlacesLibrary(apiKey: string) {
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps.places);
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-luxe-maps]");
      const done = () => {
        const places = window.google?.maps?.places;
        if (places) resolve(places);
        else reject(new Error("Google Maps Places library did not load"));
      };
      if (existing) {
        existing.addEventListener("load", done);
        existing.addEventListener("error", () => reject(new Error("Google Maps script failed")));
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.async = true;
      script.dataset.luxeMaps = "1";
      script.onload = done;
      script.onerror = () => reject(new Error("Google Maps script failed"));
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

export async function fetchLivePlaceReviews(placeId: string, apiKey: string): Promise<{
  rating: number;
  reviewCount: number;
  mapsUrl: string;
  reviews: Omit<GoogleReview, "outlet" | "locationId">[];
} | null> {
  if (!placeId || !apiKey) return null;
  const places = await loadPlacesLibrary(apiKey);
  const host = document.createElement("div");
  host.style.display = "none";
  document.body.appendChild(host);
  try {
    return await new Promise((resolve, reject) => {
      const svc = new places.PlacesService(host);
      svc.getDetails(
        { placeId, fields: ["name", "rating", "user_ratings_total", "reviews", "url"] },
        (result, status) => {
          if (status !== places.PlacesServiceStatus.OK || !result) {
            reject(new Error(status || "Place details failed"));
            return;
          }
          resolve({
            rating: Number(result.rating ?? 0),
            reviewCount: Number(result.user_ratings_total ?? result.reviews?.length ?? 0),
            mapsUrl: result.url ?? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`,
            reviews: (result.reviews ?? []).map((r, i) => ({
              id: `live-${placeId}-${i}`,
              author: r.author_name ?? "Google user",
              rating: Number(r.rating ?? 0),
              comment: r.text ?? "",
              relativeTime: r.relative_time_description ?? "",
              live: true,
            })),
          });
        },
      );
    });
  } finally {
    host.remove();
  }
}
