import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/tenant";
import { qrLandingUrl } from "@/lib/qr-loyalty";

export const Route = createFileRoute("/loyalty/qr")({
  component: OutletQrPage,
});

function OutletQrPage() {
  const { org, location, locationId } = useTenant();
  const locId = locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId;
  const locName = location?.name ?? org.locations[0]?.name ?? org.name;
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = qrLandingUrl(origin || "https://app.luxesalon.in", org.slug || "luxe-salon-group", locId);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(url)}`;

  return (
    <div className="max-w-xl rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <QrCode className="size-5 text-primary" />
        <h2 className="font-display text-lg">Outlet QR · {locName}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Prints to your public site (/{org.slug}). Guests book, spin the prize wheel, and check in instantly on that one URL.
      </p>
      <div className="mt-5 flex justify-center">
        <div className="rounded-xl border border-border bg-background p-3">
          <img src={qrSrc} alt={`QR for ${url}`} width={220} height={220} className="size-[220px]" />
        </div>
      </div>
      <p className="mt-3 truncate font-mono text-xs text-muted-foreground">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Check-in link copied");
          }}
        >
          <Copy /> Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const a = document.createElement("a");
            a.href = qrSrc;
            a.download = `${locId}-checkin-qr.png`;
            a.click();
            toast.success("Print file downloaded");
          }}
        >
          <Download /> Download
        </Button>
        <Button size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            Open guest page
          </a>
        </Button>
      </div>
    </div>
  );
}
