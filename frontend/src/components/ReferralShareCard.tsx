import { Copy, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { orgPublicSlug, publicSalonBookingUrl } from "@/pages/Loyalty/referral-share-url";

export function ReferralShareCard({
  code,
  salonName,
  orgSlug,
  locationId,
  earnLabel,
  className,
}: {
  code?: string;
  salonName?: string;
  orgSlug?: string;
  locationId?: string | number;
  /** What the sharer earns. Omit or empty = show the link only. */
  earnLabel?: string | null;
  className?: string;
}) {
  const value = String(code ?? "").trim().toUpperCase();
  const slug = String(orgSlug ?? "").trim() || orgPublicSlug({ name: salonName, slug: "" });
  const bookUrl = slug ? publicSalonBookingUrl({ slug, code: value || undefined, locationId }) : "";
  const walkInUrl = slug ? publicSalonBookingUrl({ slug, code: value || undefined, locationId, walkIn: true }) : "";
  if (!bookUrl && !value) return null;

  const earn = String(earnLabel ?? "").trim();
  const shareText = earn
    ? `${earn}\n${bookUrl || value}`
    : bookUrl
      ? `Book at ${salonName || "this salon"}\n${bookUrl}`
      : value;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Referral code copied");
    } catch {
      toast.message(value);
    }
  }

  async function copyLink() {
    const url = bookUrl || value;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.message(url);
    }
  }

  function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void navigator
        .share({ title: salonName ? `Book ${salonName}` : "Salon booking", text: shareText, url: bookUrl || undefined })
        .catch(() => void copyLink());
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("rounded-xl border border-border bg-muted/30 p-4", className)}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {earn ? "Share & earn" : "Share this salon"}
      </p>
      {salonName ? <p className="mt-0.5 text-sm font-medium">{salonName}</p> : null}
      {value ? <p className="font-display mt-1 font-mono text-xl tracking-wide">{value}</p> : null}
      {bookUrl ? (
        <p className="mt-2 break-all font-mono text-[11px] text-primary">{bookUrl}</p>
      ) : null}
      {earn ? <p className="mt-2 text-sm font-medium text-foreground">{earn}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {bookUrl ? (
          <Button type="button" size="sm" onClick={() => void copyLink()}>
            <Link2 className="size-3.5" />
            Copy link
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => void copyCode()}>
            <Copy className="size-3.5" />
            Copy code
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={share}>
          <Share2 className="size-3.5" />
          Share
        </Button>
        {walkInUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(walkInUrl).then(() => toast.success("Walk-in link copied"))}
          >
            Copy walk-in link
          </Button>
        ) : null}
      </div>
    </div>
  );
}
