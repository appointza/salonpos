import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  joinMatchList,
  parseMatchList,
  resolveServiceFromToken,
} from "@/pages/Memberships/membership";
import type { Row } from "@/store";
import { X } from "lucide-react";

export function ServiceMatchField({
  id,
  label,
  hint,
  value,
  onChange,
  services,
  disabled,
  single,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  services: Row[];
  disabled?: boolean;
  /** Pick one service instead of a list. */
  single?: boolean;
}) {
  const tokens = parseMatchList(value);
  const selectedRows = tokens
    .map((token) => resolveServiceFromToken(token, services))
    .filter((s): s is Row => Boolean(s));
  const selectedIds = new Set(selectedRows.map((s) => String(s.id)));
  const leftover = tokens.filter((token) => !resolveServiceFromToken(token, services));
  const available = services.filter((s) => !selectedIds.has(String(s.id)));

  const persist = (rows: Row[], extras: string[] = leftover) => {
    onChange(joinMatchList([...rows.map((s) => String(s.id)), ...extras]));
  };

  const add = (serviceId: string) => {
    const svc = services.find((s) => String(s.id) === serviceId);
    if (!svc) return;
    if (single) {
      onChange(String(svc.id));
      return;
    }
    if (selectedIds.has(String(svc.id))) return;
    persist([...selectedRows, svc]);
  };

  const remove = (serviceId: string) => {
    persist(selectedRows.filter((s) => String(s.id) !== serviceId));
  };

  return (
    <div className="sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="mb-2 mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mb-2 flex min-h-7 flex-wrap gap-1">
        {selectedRows.length === 0 && leftover.length === 0 ? (
          <span className="text-xs text-muted-foreground">No services selected</span>
        ) : (
          <>
            {selectedRows.map((s) => (
              <Badge key={String(s.id)} variant="secondary" className="gap-1 pr-1">
                {String(s["name"])}
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${String(s["name"])}`}
                    onClick={() => remove(String(s.id))}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
            {leftover.map((name) => (
              <Badge key={name} variant="outline" className="gap-1 pr-1">
                {name}
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => persist(selectedRows, leftover.filter((x) => x !== name))}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </>
        )}
      </div>
      {!disabled ? (
        available.length > 0 && (!single || selectedRows.length === 0) ? (
          <Select onValueChange={add}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder="Select service to add…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={String(s.id)} value={String(s.id) || `svc-${String(s["name"] ?? "")}`}>
                  {String(s["name"])}
                  {s["category"] ? ` · ${String(s["category"])}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select disabled>
            <SelectTrigger id={id} className="w-full">
              <SelectValue
                placeholder={
                  services.length === 0
                    ? "No services — add them under Services first"
                    : single
                      ? "Service selected"
                      : "All services already added"
                }
              />
            </SelectTrigger>
          </Select>
        )
      ) : null}
    </div>
  );
}
