import { Calendar, Gift, Pencil, Tag, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Row } from "@/lib/store";
import {
  getOfferBadgeLabel,
  getOfferHeadline,
  getOfferHighlight,
  getOfferSubtext,
  statusVariant,
} from "@/lib/offers/offer-display";

type OfferCardProps = {
  offer: Row;
  outletName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
};

export function OfferCard({ offer, outletName, onEdit, onDelete, readOnly }: OfferCardProps) {
  const status = String(offer["status"] ?? "Draft");
  const segment = String(offer["eligibleSegment"] ?? "All");
  const headline = getOfferHeadline(offer);
  const subtext = getOfferSubtext(offer);
  const highlight = getOfferHighlight(offer);
  const isBundle = String(offer["offerType"] ?? "") === "Buy X get free";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={statusVariant(status)}>{status}</Badge>
          <Badge variant="outline" className="bg-background/80">
            {getOfferBadgeLabel(offer)}
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm"
            aria-hidden
          >
            {highlight}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base leading-snug text-foreground">{headline}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{subtext}</p>
          </div>
        </div>
        {isBundle && Number(offer["buyQty"] ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: Number(offer["buyQty"] ?? 0) }).map((_, i) => (
              <span
                key={`paid-${i}`}
                className="inline-flex size-7 items-center justify-center rounded-full border border-primary/30 bg-background text-[10px] font-medium text-primary"
              >
                {i + 1}
              </span>
            ))}
            {Array.from({ length: Number(offer["freeQty"] ?? 1) || 1 }).map((_, i) => (
              <span
                key={`free-${i}`}
                className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-emerald-500/50 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700"
              >
                FREE
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0" />
          <span>{segment === "All" ? "All customers" : segment}</span>
        </div>
        {outletName ? (
          <div className="flex items-center gap-2">
            <Tag className="size-3.5 shrink-0" />
            <span>{outletName}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 shrink-0" />
          <span>
            {String(offer["validityStart"] ?? "—")} → {String(offer["validityEnd"] ?? "—")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Gift className="size-3.5 shrink-0" />
          <span className="font-mono text-[11px]">{String(offer.id)}</span>
        </div>
      </div>

      {!readOnly && (onEdit || onDelete) ? (
        <div className="flex gap-2 border-t border-border p-3">
          {onEdit ? (
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
