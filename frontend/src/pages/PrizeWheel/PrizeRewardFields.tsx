import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, type Row } from "@/store";
import {
  defaultPrizeValue,
  prizeNeedsNumber,
  PRIZE_TYPE_CHOICES,
  prizeValueHint,
} from "@/pages/PrizeWheel/prize-help";

function applyPrizeType(row: Row, type: string): Row {
  const next: Row = { ...row, prizeType: type };
  if (!prizeNeedsNumber(type)) {
    next.prizeValue = 0;
    return next;
  }
  const current = Number(row["prizeValue"] ?? 0);
  if (current <= 0) next.prizeValue = defaultPrizeValue(type);
  return next;
}

export function PrizeRewardFields({
  editing,
  setEditing,
  namePlaceholder,
}: {
  editing: Row;
  setEditing: (row: Row) => void;
  namePlaceholder: string;
}) {
  const { rows: services } = useCollection("services");
  const type = String(editing["prizeType"] ?? "");
  const hint = prizeValueHint(type);
  const published = services.filter((s) => String(s["active"] ?? "Yes") !== "No");

  function pickFreeService(serviceId: string) {
    const service = published.find((s) => String(s.id) === serviceId);
    if (!service) return;
    const name = String(service["name"] ?? "service");
    const currentLabel = String(editing["label"] ?? "").trim();
    const autoLabel = !currentLabel || /^free\b/i.test(currentLabel);
    setEditing({
      ...editing,
      prizeType: "Free service",
      prizeValue: Number(service.id),
      label: autoLabel ? `Free ${name}` : currentLabel,
    });
  }

  return (
    <div className="space-y-4 sm:col-span-2">
      <div>
        <Label htmlFor="prize-label" className="mb-1.5">
          Name people see
        </Label>
        <Input
          id="prize-label"
          value={String(editing["label"] ?? "")}
          placeholder={namePlaceholder}
          onChange={(e) => setEditing({ ...editing, label: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">Short and simple. Example: Free haircut, 10% off, ₹100 off.</p>
      </div>

      <div>
        <Label className="mb-1.5">What gift is this?</Label>
        <Select value={type} onValueChange={(v) => setEditing(applyPrizeType(editing, v))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pick a gift type" />
          </SelectTrigger>
          <SelectContent>
            {PRIZE_TYPE_CHOICES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label} — {c.example}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{hint.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint.help}</p>

        {prizeNeedsNumber(type) ? (
          <div className="mt-3 max-w-xs">
            <div className="flex items-center gap-2">
              <Input
                id="prizeValue"
                type="number"
                min={0}
                placeholder={hint.placeholder}
                value={String(editing["prizeValue"] ?? "")}
                onChange={(e) => setEditing({ ...editing, prizeValue: Number(e.target.value) })}
              />
              {hint.suffix ? <span className="shrink-0 text-sm text-muted-foreground">{hint.suffix}</span> : null}
            </div>
          </div>
        ) : null}

        {type === "Free service" ? (
          <div className="mt-3">
            <Label className="mb-1.5">Which treatment is free?</Label>
            {published.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a service in Services first, then pick it here. We save that service’s id.
              </p>
            ) : (
              <Select
                value={Number(editing["prizeValue"] ?? 0) > 0 ? String(editing["prizeValue"]) : undefined}
                onValueChange={pickFreeService}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a service from your menu" />
                </SelectTrigger>
                <SelectContent>
                  {published.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      {String(s["name"])} · id {String(s.id)} · {Number(s["duration"] ?? 0)} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
