import { useEffect } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { PublicBooking } from "@/components/PublicBooking";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";

export function Page() {
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const { loc } = useSearch({ from: "/$orgSlug" });
  const { tenants, org, setOrgId } = useTenant();
  const match = tenants.find((t) => t.slug === orgSlug);

  useEffect(() => {
    if (match && match.orgId !== org.orgId) setOrgId(match.orgId);
  }, [match, org.orgId, setOrgId]);

  if (!match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl">Booking page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No business is using the link <span className="font-mono">/{orgSlug}</span> yet.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/register">Claim this URL</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PublicBooking showSwitcher={false} initialLocationId={loc} bookingOrgId={match.orgId} />;
}
