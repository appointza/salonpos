import { useEffect } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { WalkInTerminal } from "@/components/WalkInTerminal";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/tenant";

export function Page() {
  const { orgSlug } = useParams({ from: "/$orgSlug/walk-in" });
  const { loc } = useSearch({ from: "/$orgSlug/walk-in" });
  const { tenants, org, setOrgId } = useTenant();
  const match = tenants.find((t) => t.slug === orgSlug);

  useEffect(() => {
    if (match && match.orgId !== org.orgId) setOrgId(match.orgId);
  }, [match, org.orgId, setOrgId]);

  if (!match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl">Walk-in page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No business is using <span className="font-mono">/{orgSlug}/walk-in</span> yet.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/register">Claim this URL</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WalkInTerminal
      publicMode
      bookingOrgId={match.orgId}
      orgSlug={match.slug}
      initialLocationId={loc}
    />
  );
}
