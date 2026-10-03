import { Navigate, useSearch } from "@tanstack/react-router";
import { publicSlug, useTenant } from "@/tenant";

export function Page() {
  const { org, loading } = useTenant();
  const { loc, org: orgParam } = useSearch({ from: "/walk-in" });
  const slug = publicSlug({ slug: orgParam, name: org.name }) || publicSlug(org);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Opening walk-in check-in…</p>
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">No salon is available for walk-in yet.</p>
      </div>
    );
  }

  return <Navigate to="/$orgSlug/walk-in" params={{ orgSlug: slug }} search={{ loc }} replace />;
}
