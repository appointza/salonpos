import { Link } from "@tanstack/react-router";
import { BRAND_LOGO } from "@/brand";
import { cn } from "@/utils/utils";

export function BrandLockup({
  to = "/",
  compact = false,
  inverted = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      aria-label="Kriosapp home"
    >
      <img
        src={BRAND_LOGO}
        alt=""
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        className={cn("shrink-0 rounded-[10px] object-cover", compact ? "size-8" : "size-9")}
      />
      <span
        className={cn(
          "font-display min-w-0 leading-none font-semibold",
          compact ? "text-lg" : "text-xl",
          inverted ? "text-white" : "text-foreground",
        )}
      >
        Kriosapp
        <small
          className={cn(
            "mt-0.5 block font-sans text-[0.58rem] font-semibold tracking-[0.18em]",
            inverted ? "text-white/65" : "text-muted-foreground",
          )}
        >
          SALON & SPA
        </small>
      </span>
    </Link>
  );
}
