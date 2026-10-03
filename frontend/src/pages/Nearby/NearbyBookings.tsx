import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyBookings } from "@/pages/Nearby/use-my-bookings";
import { useCustomerSession } from "@/pages/Login/customer-session";

export function NearbyBookingsPage() {
  const { customer } = useCustomerSession();
  const { bookings, loading, reload } = useMyBookings(customer);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-semibold">My bookings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Appointments you booked through the customer app, across all salons.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Upcoming &amp; past</h2>
          <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading your bookings…
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link to="/nearby">Browse nearby</Link>
              </Button>
              <Button asChild>
                <Link to="/nearby/booking">Book appointment</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((a) => (
              <div key={String(a.id)} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium">{String(a["service"])}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(a["outlet"])} · {String(a["staff"])}
                </p>
                <p className="mt-1 text-sm">
                  {String(a["date"])} at {String(a["time"])}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {String(a["status"])}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Salon owner?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Business login
        </Link>
      </p>
    </div>
  );
}
