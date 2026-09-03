import { Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/lib/tenant";

export function OrgLocationSwitcher({ compact = false }: { compact?: boolean }) {
  const { tenants, org, locationId, setOrgId, setLocationId } = useTenant();

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
      <Select
        value={org.orgId}
        onValueChange={(v) => {
          setOrgId(v);
          const next = tenants.find((t) => t.orgId === v);
          toast.success(`Switched to ${next?.name ?? "organisation"}`, { description: "Showing all locations" });
        }}
      >
        <SelectTrigger className="h-9 w-full min-w-[11rem] bg-card sm:w-auto" aria-label="Select organisation">
          <Building2 className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((t) => (
            <SelectItem key={t.orgId} value={t.orgId}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={locationId}
        onValueChange={(v) => {
          setLocationId(v);
          const loc = org.locations.find((l) => l.locationId === v);
          toast.success(v === "all" ? "Showing all locations" : `Location: ${loc?.name}`, {
            description: v === "all" ? org.name : `${loc?.code} · ${loc?.city}`,
          });
        }}
      >
        <SelectTrigger className="h-9 w-full min-w-[11rem] bg-card sm:w-auto" aria-label="Select location">
          <MapPin className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {org.locations.map((l) => (
            <SelectItem key={l.locationId} value={l.locationId}>
              {l.name} · {l.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
