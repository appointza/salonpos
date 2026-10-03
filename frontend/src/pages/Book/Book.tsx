import { Navigate } from "@tanstack/react-router";
import { publicSlug, useTenant } from "@/tenant";

export function Page() {
  const { org, loading } = useTenant();
  const slug = publicSlug(org);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Opening booking page…</p>
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">No salon is available to book yet.</p>
      </div>
    );
  }

  return <Navigate to="/$orgSlug" params={{ orgSlug: slug }} replace />;
}
