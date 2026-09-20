import type { Row } from "@/lib/store";

export const OFFER_TYPES = ["% off", "Flat off", "Free item", "Free service", "Buy X get free"] as const;

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Human headline for cards — e.g. "Buy 4 services → 5th service FREE" */
export function getOfferHeadline(offer: Row) {
  const type = String(offer["offerType"] ?? "");
  const paid = Number(offer["buyQty"] ?? 0);
  const free = Number(offer["freeQty"] ?? 1) || 1;
  const service = String(offer["serviceName"] ?? "").trim() || "service";
  const serviceLabel = paid > 1 ? `${service}s` : service;

  if (type === "Buy X get free" && paid > 0) {
    const freePosition = paid + free;
    return `Buy ${paid} ${serviceLabel} → ${ordinal(freePosition)} ${service} FREE`;
  }

  const title = String(offer["title"] ?? "").trim();
  if (title) return title;

  return String(offer["description"] ?? "Special offer");
}

export function getOfferSubtext(offer: Row) {
  const desc = String(offer["description"] ?? "").trim();
  const type = String(offer["offerType"] ?? "");
  const headline = getOfferHeadline(offer);

  if (desc && desc !== headline) return desc;

  if (type === "% off") return "Percentage discount on eligible services.";
  if (type === "Flat off") return "Fixed amount off your bill.";
  if (type === "Free item") return "Complimentary retail item with qualifying visit.";
  if (type === "Free service") return "Complimentary service with qualifying visit.";
  if (type === "Buy X get free") return "Bundle deal — free service unlocks after paid visits.";
  return "Show at checkout or after QR check-in.";
}

export function getOfferBadgeLabel(offer: Row) {
  const type = String(offer["offerType"] ?? "");
  if (type === "Buy X get free") return "Bundle";
  if (type === "% off") return "% Off";
  if (type === "Flat off") return "Flat off";
  if (type === "Free service") return "Free service";
  if (type === "Free item") return "Free item";
  return type || "Offer";
}

export function getOfferHighlight(offer: Row) {
  const type = String(offer["offerType"] ?? "");
  const hay = `${String(offer["title"] ?? "")} ${String(offer["description"] ?? "")}`.toLowerCase();

  if (type === "Buy X get free") {
    const paid = Number(offer["buyQty"] ?? 0);
    const free = Number(offer["freeQty"] ?? 1) || 1;
    if (paid > 0) return `${paid}+${free}`;
  }

  const pct = hay.match(/(\d+)\s*%/);
  if (pct) return `${pct[1]}%`;

  const flat = hay.match(/₹\s*(\d+)/);
  if (flat) return `₹${flat[1]}`;

  if (type === "Free service" || type === "Free item") return "FREE";

  return "DEAL";
}

export function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active":
      return "default";
    case "Draft":
      return "secondary";
    case "Paused":
      return "outline";
    case "Expired":
      return "destructive";
    default:
      return "secondary";
  }
}
