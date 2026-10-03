import { useEffect, useState, type ReactNode } from "react";
import { Copy, Download, Globe, QrCode, UserRound } from "lucide-react";
import { toast } from "sonner";
import { GrowthTabsLayout } from "@/components/GrowthTabsLayout";
import { Button } from "@/components/ui/button";
import { publicSlug, useTenant } from "@/tenant";
import { publicSiteUrl, walkInSiteUrl } from "@/pages/LoyaltyQr/qr-loyalty";

function qrImageSrc(url: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(url)}`;
}

async function downloadQrPng(url: string, filename: string) {
  const res = await fetch(qrImageSrc(url, 1200));
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

function QrLinkCard({
  icon,
  title,
  description,
  url,
  filename,
  copyLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  url: string;
  filename: string;
  copyLabel: string;
}) {
  const qrSrc = qrImageSrc(url);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex justify-center">
        <div className="rounded-xl border border-border bg-background p-3">
          <img src={qrSrc} alt={`QR for ${url}`} width={220} height={220} className="size-[220px]" />
        </div>
      </div>
      <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success(copyLabel);
          }}
        >
          <Copy /> Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void downloadQrPng(url, filename)
              .then(() => toast.success("QR downloaded"))
              .catch(() => toast.error("Couldn't download the QR file"));
          }}
        >
          <Download /> Download
        </Button>
        <Button size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            Open page
          </a>
        </Button>
      </div>
    </div>
  );
}

export function OutletQrPage() {
  const { org, location, locationId } = useTenant();
  const locId = locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId;
  const locName = location?.name ?? org.locations[0]?.name ?? org.name;
  const slug = publicSlug(org) || org.slug || "salon";
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const host = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const publicUrl = publicSiteUrl(host, slug, locId);
  const walkInUrl = walkInSiteUrl(host, slug, locId);

  return (
    <GrowthTabsLayout>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Print these for <strong>{locName}</strong>. Guests scan to open the public booking site or the walk-in
          check-in page.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <QrLinkCard
            icon={<Globe className="size-5 text-primary" />}
            title="Public site"
            description={`Booking page at /${slug}. Guests pick services, book a slot, and play the guest reward game.`}
            url={publicUrl}
            filename={`${slug}-public-site-qr.png`}
            copyLabel="Public site link copied"
          />
          <QrLinkCard
            icon={<UserRound className="size-5 text-primary" />}
            title="Walk-in"
            description={`Kiosk at /${slug}/walk-in. Guests check in with their phone and play today's reward game.`}
            url={walkInUrl}
            filename={`${slug}-walk-in-qr.png`}
            copyLabel="Walk-in link copied"
          />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <QrCode className="size-3.5" />
          Both codes include the selected outlet when you are not on All locations.
        </p>
      </div>
    </GrowthTabsLayout>
  );
}
