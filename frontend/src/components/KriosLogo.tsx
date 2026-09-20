import { Link } from "@tanstack/react-router";
import { BRAND_LOGO, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type KriosLogoProps = {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  to?: string;
};

export function KriosLogo({
  size = 36,
  showWordmark = true,
  subtitle,
  className,
  to,
}: KriosLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={BRAND_LOGO}
        alt={BRAND_NAME}
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      {showWordmark ? (
        <div className="min-w-0 text-left">
          <p className="font-display text-base leading-none font-semibold tracking-tight">{BRAND_NAME}</p>
          {subtitle ? <p className="mt-1 truncate text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex rounded-lg transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
