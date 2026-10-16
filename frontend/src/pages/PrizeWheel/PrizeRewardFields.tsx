import { ServiceThumb } from "@/components/ServiceThumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, type Row } from "@/store";
import {
  autoPrizeLabel,
  defaultPrizeValue,
  prizeNeedsNumber,
  prizeNeedsService,
  PRIZE_TYPE_CHOICES,
  prizeValueHint,
} from "@/pages/PrizeWheel/prize-help";

function applyPrizeType(row: Row, type: string): Row {
  const next: Row = { ...row, prizeType: type };
  if (type === "Free service") {
    const sid = Number(row["serviceId"] ?? row["prizeValue"] ?? 0);
    if (sid > 0) {
      next.serviceId = sid;
      next.prizeValue = sid;
    } else {
      next.prizeValue = 0;
      next.serviceId = 0;
    }
    return next;
  }
  if (!prizeNeedsService(type)) next.serviceId = 0;
  if (!prizeNeedsNumber(type)) {
    next.prizeValue = 0;
    return next;
  }
  const current = Number(row["prizeValue"] ?? 0);
  const looksLikeServiceId = type !== "Bonus points" && current > 1000;
  if (current <= 0 || (type !== "Bonus points" && looksLikeServiceId && Number(row["serviceId"] ?? 0) === current)) {
    next.prizeValue = defaultPrizeValue(type);
  }
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
  const showService = prizeNeedsService(type);
  const selectedServiceId =
    Number(editing["serviceId"] ?? 0) > 0
      ? String(editing["serviceId"])
      : type === "Free service" && Number(editing["prizeValue"] ?? 0) > 0
        ? String(editing["prizeValue"])
        : "";
  const selectedService = published.find((s) => String(s.id) === selectedServiceId);
  const serviceName = String(selectedService?.["name"] ?? "");

  function maybeAutoLabel(next: Row, prizeType: string, prizeValue: number, name: string) {
    const currentLabel = String(next["label"] ?? "").trim();
    const autoLabel = !currentLabel || /^(free|[\d%₹])/i.test(currentLabel);
    if (!autoLabel) return next;
    const label = autoPrizeLabel(prizeType, prizeValue, name);
    return label ? { ...next, label } : next;
  }

  function pickService(serviceId: string) {
    if (serviceId === "__bill__") {
      const amount = Number(editing["prizeValue"] ?? 0) || defaultPrizeValue(type);
      setEditing(maybeAutoLabel({ ...editing, serviceId: 0, prizeValue: amount }, type, amount, ""));
      return;
    }
    const service = published.find((s) => String(s.id) === serviceId);
    if (!service) return;
    const name = String(service["name"] ?? "service");
    const sid = Number(service.id);
    if (type === "Free service") {
      setEditing(
        maybeAutoLabel(
          { ...editing, prizeType: "Free service", serviceId: sid, prizeValue: sid },
          "Free service",
          sid,
          name,
        ),
      );
      return;
    }
    const amount = Number(editing["prizeValue"] ?? 0) || defaultPrizeValue(type);
    setEditing(maybeAutoLabel({ ...editing, serviceId: sid, prizeValue: amount }, type, amount, name));
  }

  return (
    <div className="space-y-4 sm:col-span-2">
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

        {showService ? (
          <div className="mt-3">
            <Label className="mb-1.5">
              {type === "Free service" ? "Which treatment is free?" : "Applies to"}
            </Label>
            {published.length === 0 && type === "Free service" ? (
              <p className="text-sm text-muted-foreground">Add a service in Services first, then pick it here.</p>
            ) : (
              <Select
                value={type === "Free service" ? selectedServiceId || undefined : selectedServiceId || "__bill__"}
                onValueChange={pickService}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      type === "Free service"
                        ? "Pick a service from your menu"
                        : "Whole bill, or one service"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {type !== "Free service" ? (
                    <SelectItem value="__bill__">Whole bill</SelectItem>
                  ) : null}
                  {published.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      <span className="flex items-center gap-2">
                        <ServiceThumb imageId={s["imageId"]} name={String(s["name"])} size={20} />
                        {String(s["name"])} · ₹{Number(s["price"] ?? 0).toLocaleString("en-IN")}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}

        {prizeNeedsNumber(type) ? (
          <div className="mt-3 max-w-xs">
            <div className="flex items-center gap-2">
              <Input
                id="prizeValue"
                type="number"
                min={0}
                placeholder={hint.placeholder}
                value={String(editing["prizeValue"] ?? "")}
                onChange={(e) => {
                  const prizeValue = Number(e.target.value);
                  setEditing(maybeAutoLabel({ ...editing, prizeValue }, type, prizeValue, serviceName));
                }}
              />
              {hint.suffix ? <span className="shrink-0 text-sm text-muted-foreground">{hint.suffix}</span> : null}
            </div>
          </div>
        ) : null}
      </div>

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
        <p className="mt-1 text-xs text-muted-foreground">
          Fills in from the offer. Example: 10% off the bill, 10% off haircut, ₹200 off facial.
        </p>
      </div>
    </div>
  );
}
