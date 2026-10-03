import { serviceDisplayPrices, type ServiceDisplaySettings } from "@/pages/Services/service-display-settings";
import { cn } from "@/utils/utils";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function ServicePriceDisplay({
  price,
  settings,
  className,
  size = "sm",
}: {
  price: number;
  settings: ServiceDisplaySettings;
  className?: string;
  size?: "xs" | "sm";
}) {
  const { actual, list, markupPct } = serviceDisplayPrices(price, settings);

  if (markupPct <= 0 || list <= actual) {
    return <span className={cn(size === "xs" ? "text-xs" : "text-sm", "font-semibold text-primary", className)}>{money(actual)}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn(size === "xs" ? "text-[11px]" : "text-xs", "text-muted-foreground line-through")}>{money(list)}</span>
      <span className={cn(size === "xs" ? "text-xs" : "text-sm", "font-semibold text-primary")}>{money(actual)}</span>
    </span>
  );
}
