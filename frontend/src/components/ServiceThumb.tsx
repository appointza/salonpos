import { Scissors } from "lucide-react";
import { assetImageUrl } from "@/brand";
import { cn } from "@/utils/utils";

export function ServiceThumb({
  imageId,
  name,
  size = 40,
  className,
}: {
  imageId?: unknown;
  name?: string;
  size?: number;
  className?: string;
}) {
  const src = assetImageUrl(imageId as string | number | null);
  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Scissors style={{ width: size * 0.45, height: size * 0.45 }} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name || ""}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md bg-muted object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
