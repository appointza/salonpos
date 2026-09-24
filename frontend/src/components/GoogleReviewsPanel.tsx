import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MapPin, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import {
  fetchLivePlaceReviews,
  formatSyncedAgo,
  isGoogleSyncStale,
  locationPlaceId,
  locationSyncedAt,
  locationSyncMeta,
  mapsApiKey,
  mapsListingUrl,
  reviewRowsFromLive,
  reviewsFromRows,
  summaryFromStore,
} from "@/lib/google-places";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-3.5 ${i < full ? "fill-current" : "text-muted-foreground"}`} />
      ))}
    </span>
  );
}

export function GoogleReviewsPanel() {
  const { locationId, scopeLabel } = useTenant();
  const { db, replaceGoogleReviews } = useData();
  const locations = db["locations"] ?? [];
  const stored = db["googleReviews"] ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const autoTried = useRef(new Set<string>());
  const key = mapsApiKey();

  const scopedLocations = useMemo(
    () => locations.filter((l) => locationId === "all" || String(l["locationId"] ?? l.id) === locationId),
    [locations, locationId],
  );

  const cards = useMemo(
    () => scopedLocations.map((loc) => summaryFromStore(loc, stored)),
    [scopedLocations, stored],
  );

  const persistSync = useCallback(
    (loc: Row, reviews: Row[], meta: { rating: number; reviewCount: number; mapsUrl: string; source: "google" | "stored" }) => {
      replaceGoogleReviews(String(loc["locationId"] ?? loc.id), reviews, locationSyncMeta(meta));
    },
    [replaceGoogleReviews],
  );

  const syncLocation = useCallback(
    async (loc: Row, reason: "auto" | "manual") => {
      const locId = String(loc["locationId"] ?? loc.id);
      const placeId = locationPlaceId(loc);
      const existing = reviewsFromRows(stored, locId);
      setBusyId(locId);
      try {
        if (key && placeId) {
          const fetched = await fetchLivePlaceReviews(placeId, key);
          if (!fetched) throw new Error("Google returned no listing");
          persistSync(loc, reviewRowsFromLive(loc, fetched.reviews), {
            rating: fetched.rating,
            reviewCount: fetched.reviewCount,
            mapsUrl: fetched.mapsUrl,
            source: "google",
          });
          if (reason === "manual") toast.success(`Synced ${loc["name"]} from Google`);
          return;
        }
        persistSync(
          loc,
          existing.map((r) => ({
            id: r.id,
            author: r.author,
            rating: r.rating,
            comment: r.comment,
            relativeTime: r.relativeTime,
            outlet: r.outlet,
            locationId: r.locationId,
            source: "Google",
          })),
          {
            rating: Number(loc["googleRating"] ?? 0) || (existing.length ? existing.reduce((s, r) => s + r.rating, 0) / existing.length : 0),
            reviewCount: Number(loc["googleReviewCount"] ?? existing.length),
            mapsUrl: String(loc["googleMapsUrl"] ?? "") || mapsListingUrl(loc),
            source: "stored",
          },
        );
        if (reason === "manual") {
          toast.message(key ? "Add a Place ID in Settings to pull live comments" : "Stored reviews refreshed", {
            description: "Set VITE_GOOGLE_MAPS_API_KEY to pull from Google.",
          });
        }
      } catch (err) {
        if (reason === "manual") {
          toast.error(err instanceof Error ? err.message : "Could not sync Google reviews");
        }
      } finally {
        setBusyId(null);
      }
    },
    [key, persistSync, stored],
  );

  useEffect(() => {
    if (!key) return;
    const stale = scopedLocations.find((loc) => {
      const id = String(loc["locationId"] ?? loc.id);
      return locationPlaceId(loc) && isGoogleSyncStale(locationSyncedAt(loc)) && !autoTried.current.has(id);
    });
    if (!stale) return;
    autoTried.current.add(String(stale["locationId"] ?? stale.id));
    void syncLocation(stale, "auto");
  }, [key, scopedLocations, syncLocation]);

  if (scopedLocations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No outlets in this organisation yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hybrid sync for {scopeLabel}: comments are stored here and shown from the database. Google is called only
        when a listing is stale (over 6 hours) or you press Refresh.
        {!key ? " Demo listings stay stored until a Maps API key is set." : ""}
      </p>
      {cards.map((card) => {
        const loc = scopedLocations.find((l) => String(l["locationId"] ?? l.id) === card.locationId);
        return (
          <PlaceCard
            key={card.locationId}
            card={card}
            location={loc}
            busy={busyId === card.locationId}
            onRefresh={() => loc && syncLocation(loc, "manual")}
          />
        );
      })}
    </div>
  );
}

function PlaceCard({
  card,
  location,
  busy,
  onRefresh,
}: {
  card: ReturnType<typeof summaryFromStore>;
  location?: Row;
  busy: boolean;
  onRefresh: () => void;
}) {
  const mapsUrl = card.mapsUrl || (location ? mapsListingUrl(location) : "#");
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="flex items-center gap-2 font-medium">
            <MapPin className="size-4 text-primary" />
            {card.outlet}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Stars value={card.rating} />
            <span className="font-medium text-foreground">{card.rating || "—"}</span>
            <span>· {card.reviewCount} Google reviews</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatSyncedAgo(card.syncedAt)}
            {card.stale ? " · stale" : ""}
            {card.placeId ? ` · ${card.placeId}` : " · no Place ID"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={card.source === "google" ? "default" : "secondary"}>
            {card.source === "google" ? "Stored from Google" : "Stored locally"}
          </Badge>
          <Button variant="outline" size="sm" disabled={busy} onClick={onRefresh}>
            <RefreshCw className={busy ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Open on Maps <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
      {card.reviews.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Nothing stored yet. Publish the salon on Google Maps, add the Place ID in Settings, then Refresh.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {card.reviews.map((review) => (
            <li key={review.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{review.author}</p>
                <Stars value={review.rating} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {review.relativeTime}
                {review.outlet ? ` · ${review.outlet}` : ""}
              </p>
              <p className="mt-2 text-sm">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
