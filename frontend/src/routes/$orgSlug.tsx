import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicBooking } from "@/components/PublicBooking";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";

const title = "Book online — Salon booking page";
const description = "Public salon booking page: pick a location, service and stylist, then confirm your appointment online.";

export const Route = createFileRoute("/$orgSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    loc: typeof search.loc === "string" ? search.loc : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `https://ui-buddy-crud.lovable.app/${params.orgSlug}` }],
  }),
  component: Page,
});

function Page() {
  const { orgSlug } = Route.useParams();
  const { loc } = Route.useSearch();
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

  return <PublicBooking showSwitcher={false} initialLocationId={loc} />;
}
