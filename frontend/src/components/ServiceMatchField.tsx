import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  joinMatchList,
  parseMatchList,
  resolveServiceFromToken,
} from "@/pages/Memberships/membership";
import { ServiceThumb } from "@/components/ServiceThumb";
import type { Row } from "@/store";
import { cn } from "@/utils/utils";

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
  const [open, setOpen] = useState(false);
  const tokens = parseMatchList(value);
  const selectedRows = tokens
    .map((token) => resolveServiceFromToken(token, services))
    .filter((s): s is Row => Boolean(s));
  const selectedIds = new Set(selectedRows.map((s) => String(s.id)));
  const leftover = tokens.filter((token) => !resolveServiceFromToken(token, services));
  const available = services.filter((s) => !selectedIds.has(String(s.id)));
  const canAdd = !disabled && available.length > 0 && (!single || selectedRows.length === 0);

  const persist = (rows: Row[], extras: string[] = leftover) => {
    onChange(joinMatchList([...rows.map((s) => String(s.id)), ...extras]));
  };

  const add = (serviceId: string) => {
    const svc = services.find((s) => String(s.id) === serviceId);
    if (!svc) return;
    if (single) {
      onChange(String(svc.id));
      setOpen(false);
      return;
    }
    if (selectedIds.has(String(svc.id))) return;
    persist([...selectedRows, svc]);
    setOpen(false);
  };

  const remove = (serviceId: string) => {
    persist(selectedRows.filter((s) => String(s.id) !== serviceId));
  };

  const placeholder =
    services.length === 0
      ? "No services — add them under Services first"
      : single && selectedRows.length > 0
        ? "Service selected"
        : available.length === 0
          ? "All services already added"
          : "Search services…";

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
                <ServiceThumb imageId={s["imageId"]} name={String(s["name"])} size={16} />
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
        <Popover open={open} onOpenChange={setOpen} modal>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={!canAdd}
              className="h-9 w-full justify-between font-normal"
            >
              <span className="truncate text-muted-foreground">{placeholder}</span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Type to search services…" />
              <CommandList>
                <CommandEmpty>No matching service.</CommandEmpty>
                <CommandGroup>
                  {available.map((s) => {
                    const sid = String(s.id);
                    const name = String(s["name"] ?? "");
                    const category = String(s["category"] ?? "");
                    return (
                      <CommandItem
                        key={sid || `svc-${name}`}
                        value={`${name} ${category} ${sid}`}
                        onSelect={() => add(sid)}
                      >
                        <Check className={cn("size-4", selectedIds.has(sid) ? "opacity-100" : "opacity-0")} />
                        <ServiceThumb imageId={s["imageId"]} name={name} size={22} />
                        <span className="min-w-0 flex-1 truncate">
                          {name}
                          {category ? ` · ${category}` : ""}
                        </span>
                        {s["price"] != null && s["price"] !== "" ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            ₹{Number(s["price"]).toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
