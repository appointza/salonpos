import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, LocateFixed, Loader2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, saveBookingPick } from "@/pages/Nearby/nearby-utils";
import { useNearbyStudios } from "@/pages/Nearby/use-nearby-studios";
import type { NearbyStudio } from "@/services/nearby.service";

export function NearbyPage() {
  const navigate = useNavigate();
  const { located, locating, studios, loading, error, locateMe, refresh } = useNearbyStudios();

  function bookHere(studio: NearbyStudio) {
    saveBookingPick({ orgId: studio.org.orgId, locationId: studio.loc.locationId });
    void navigate({ to: "/nearby/booking" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {located
            ? "Salons sorted by distance from you."
            : "Turn on location for accurate distances."}
        </p>
        <Button variant="outline" size="sm" onClick={() => locateMe()} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          {located ? "Location on" : "Use my location"}
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="font-display text-lg font-semibold">
            Nearby salons
            {!loading && studios.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({studios.length})</span>
            ) : null}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading salons near you…
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : studios.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No salons found yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {studios.map((s) => (
              <li key={`${s.org.orgId}-${s.loc.locationId}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-2 font-medium">
                      <MapPin className="size-4 shrink-0 text-primary" />
                      {s.loc.name}
                    </p>
                    <Badge variant="secondary">{formatDistance(s.km, s.approximateDistance)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.org.name}</p>
                  {s.loc.address ? <p className="mt-0.5 text-xs text-muted-foreground">{s.loc.address}</p> : null}
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {s.loc.city ? <span>{s.loc.city}</span> : null}
                    {s.loc.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {s.loc.phone}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => bookHere(s)}>
                  <CalendarCheck />
                  Book here
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Already booked?{" "}
        <Link to="/nearby/my-bookings" className="text-primary hover:underline">
          View my bookings
        </Link>
      </p>
    </div>
  );
}
