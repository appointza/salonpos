import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";
import { remainingFor } from "@/lib/business/inventory-service";

export const SERVICE_PRODUCTS = "serviceProducts";

export type RecipeNeed = { skuId: string; quantity: number };

export function parseProductNeeds(value: string | number | undefined): RecipeNeed[] {
  const out: RecipeNeed[] = [];
  for (const part of String(value ?? "").split(",")) {
    const token = part.trim();
    if (!token) continue;
    const bits = token.split(":");
    const skuId = (bits[0] ?? "").trim();
    if (!skuId) continue;
    out.push({ skuId, quantity: Math.max(1, Number(bits[1]) || 1) });
  }
  return out;
}

export function serializeProductNeeds(needs: RecipeNeed[]) {
  return needs.map((n) => `${n.skuId}:${n.quantity}`).join(",");
}

function comboServiceIds(service: Row | undefined, services: Row[]): string[] {
  if (!service) return [];
  if (String(service["type"]) !== "Combo") return [String(service.id)];
  const ids = String(service["comboItems"] ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length ? ids : [String(service.id)];
}

export function recipesForService(
  serviceId: string,
  services: Row[],
  recipes: Row[],
): RecipeNeed[] {
  const service = services.find((s) => String(s.id) === serviceId);
  const ids = comboServiceIds(service, services);
  const merged = new Map<string, number>();
  for (const id of ids) {
    const svc = services.find((s) => String(s.id) === id);
    const fromTable = recipes.filter((r) => String(r["serviceId"]) === id);
    const rows = fromTable.length
      ? fromTable.map((r) => ({
          skuId: String(r["skuId"] ?? r["sku"] ?? ""),
          quantity: Math.max(1, Number(r["quantity"] ?? 1)),
        }))
      : parseProductNeeds(svc?.["productNeeds"]);
    for (const row of rows) {
      if (!row.skuId) continue;
      merged.set(row.skuId, (merged.get(row.skuId) ?? 0) + row.quantity);
    }
  }
  return [...merged.entries()].map(([skuId, quantity]) => ({ skuId, quantity }));
}

export function recipeDemand(
  lines: { id: string; kind: string; qty: number }[],
  services: Row[],
  recipes: Row[],
) {
  const demand = new Map<string, number>();
  for (const line of lines.filter((l) => l.kind === "service")) {
    for (const need of recipesForService(line.id, services, recipes)) {
      demand.set(need.skuId, (demand.get(need.skuId) ?? 0) + need.quantity * line.qty);
    }
  }
  return demand;
}

export type MissingProduct = {
  skuId: string;
  name: string;
  need: number;
  have: number;
};

export function missingProducts(
  lines: { id: string; kind: string; qty: number; name: string }[],
  ctx: { services: Row[]; recipes: Row[]; skus: Row[]; movements: Row[]; locationId?: EntityId },
): MissingProduct[] {
  const reserved: Record<string, number> = {};
  const missing: MissingProduct[] = [];
  const loc = ctx.locationId && ctx.locationId !== "all" ? ctx.locationId : undefined;

  const consider = (skuId: string, qty: number) => {
    const sku = ctx.skus.find((s) => String(s.id) === skuId);
    const have = remainingFor(skuId, ctx.movements, loc, sku) - (reserved[skuId] ?? 0);
    if (qty > have) {
      missing.push({
        skuId,
        name: String(ctx.skus.find((s) => String(s.id) === skuId)?.["name"] ?? skuId),
        need: qty,
        have: Math.max(0, have),
      });
    }
    reserved[skuId] = (reserved[skuId] ?? 0) + qty;
  };

  for (const line of lines.filter((l) => l.kind === "product")) consider(line.id, line.qty);
  for (const [skuId, qty] of recipeDemand(lines, ctx.services, ctx.recipes)) consider(skuId, qty);
  return missing;
}

export function missingMessage(rows: MissingProduct[]) {
  if (rows.length === 0) return null;
  return rows
    .map((m) => `${m.name} is missing. Need ${m.need}, have ${m.have}.`)
    .join(" ");
}
