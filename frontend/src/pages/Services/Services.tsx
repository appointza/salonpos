import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrudPage } from "@/components/CrudPage";
import { useAuth } from "@/lib/auth";
import { modules } from "@/lib/modules";
import { useData, type Row } from "@/lib/store";
import { parseProductNeeds, serializeProductNeeds, recipesForService, SERVICE_PRODUCTS } from "@/lib/service-recipe";
import { useStockService } from "@/lib/stock";

const title = "Service Catalogue — Luxe Salon CRM";
const description = "Maintain the salon service catalogue with pricing, GST slabs, commissions and combo packages.";

function parseComboIds(value: string | number | undefined) {
  return String(value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function applyComboTotals(editing: Row, selected: Row[]): Row {
  const duration = selected.reduce((sum, s) => sum + Number(s["duration"] ?? 0), 0);
  const listPrice = selected.reduce((sum, s) => sum + Number(s["price"] ?? 0), 0);
  const price = Math.round(listPrice * 0.9);
  return {
    ...editing,
    comboItems: selected.map((s) => String(s.id)).join(","),
    duration,
    price,
  };
}

function ComboPicker({
  editing,
  setEditing,
  rows,
}: {
  editing: Row;
  setEditing: (row: Row) => void;
  rows: Row[];
}) {
  if (String(editing["type"] ?? "Single") !== "Combo") return null;

  const selectedIds = parseComboIds(editing["comboItems"]);
  const options = rows.filter(
    (s) => String(s.id) !== String(editing.id) && String(s["type"] ?? "Single") !== "Combo",
  );
  const selected = options.filter((s) => selectedIds.includes(String(s.id)));
  const listPrice = selected.reduce((sum, s) => sum + Number(s["price"] ?? 0), 0);

  function toggle(id: string, checked: boolean) {
    const nextIds = checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id);
    const nextSelected = options.filter((s) => nextIds.includes(String(s.id)));
    setEditing(applyComboTotals({ ...editing, comboItems: nextIds.join(",") }, nextSelected));
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-4">
      <div>
        <Label className="mb-1.5">Services in this combo</Label>
        <p className="text-xs text-muted-foreground">
          Pick at least two services. Duration is the sum; price starts at 10% off the combined list price — you can
          still edit both above.
        </p>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add single services first, then bundle them into a combo.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {options.map((s) => {
            const id = String(s.id);
            const checked = selectedIds.includes(id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Checkbox
                  id={`combo-${id}`}
                  checked={checked}
                  onCheckedChange={(value) => toggle(id, value === true)}
                />
                <label htmlFor={`combo-${id}`} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    {String(s["name"])}{" "}
                    <span className="text-muted-foreground">· {String(s["category"])}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {Number(s["duration"] ?? 0)} min · ₹{Number(s["price"] ?? 0).toLocaleString("en-IN")}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} services · list ₹{listPrice.toLocaleString("en-IN")} · combo ₹
          {Number(editing["price"] ?? 0).toLocaleString("en-IN")} · {Number(editing["duration"] ?? 0)} min
        </p>
      )}
    </div>
  );
}

function ProductNeedsPicker({
  editing,
  setEditing,
}: {
  editing: Row;
  setEditing: (row: Row) => void;
}) {
  const stock = useStockService();
  const needs = parseProductNeeds(editing["productNeeds"]);
  const qtyOf = (skuId: string) => needs.find((n) => n.skuId === skuId)?.quantity ?? 0;
  const inherited =
    String(editing["type"]) === "Combo"
      ? recipesForService(String(editing.id), stock.services, stock.recipes).filter(
          (n) => !needs.some((own) => own.skuId === n.skuId),
        )
      : [];

  function setQty(skuId: string, quantity: number) {
    const next = needs.filter((n) => n.skuId !== skuId);
    if (quantity > 0) next.push({ skuId, quantity });
    setEditing({ ...editing, productNeeds: serializeProductNeeds(next) });
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-4">
      <div>
        <Label className="mb-1.5">Products needed for this service</Label>
        <p className="text-xs text-muted-foreground">
          POS checks remaining stock and posts <strong>Used</strong> on checkout. If a product is short, the bill shows
          it as missing.
        </p>
      </div>
      {inherited.length > 0 && (
        <p className="text-xs text-muted-foreground">
          From combo services:{" "}
          {inherited.map((n) => `${stock.skus.find((s) => String(s.id) === n.skuId)?.["name"] ?? n.skuId} ×${n.quantity}`).join(", ")}
        </p>
      )}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {stock.skus.map((sku) => {
          const id = String(sku.id);
          const qty = qtyOf(id);
          const have = stock.remaining(id);
          return (
            <li key={id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Checkbox
                id={`need-${id}`}
                checked={qty > 0}
                onCheckedChange={(value) => setQty(id, value === true ? Math.max(qty, 1) : 0)}
              />
              <label htmlFor={`need-${id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                <span className="truncate">{String(sku["name"])}</span>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">{id}</span>
                <span className={`ml-2 text-xs ${have <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {have} remaining
                </span>
              </label>
              {qty > 0 && (
                <Input
                  className="w-16"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(id, Math.max(1, Number(e.target.value) || 1))}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Page() {
  const { user } = useAuth();
  const { allRows, create, remove, orgId } = useData();
  const isStylist = user?.role === "STYLIST";

  function syncRecipes(row: Row) {
    const serviceId = String(row.id);
    for (const existing of allRows[SERVICE_PRODUCTS] ?? []) {
      if (String(existing["orgId"]) === orgId && String(existing["serviceId"]) === serviceId) {
        remove(SERVICE_PRODUCTS, String(existing.id));
      }
    }
    for (const need of parseProductNeeds(row["productNeeds"])) {
      create(SERVICE_PRODUCTS, {
        id: `SP-${serviceId}-${need.skuId}`,
        serviceId,
        sku: need.skuId,
        skuId: need.skuId,
        quantity: need.quantity,
      });
    }
  }

  return (
    <CrudPage
      module={{
        ...modules.services,
        subtitle: isStylist ? "Services you can book and deliver. Catalogue edits are for managers." : modules.services.subtitle,
      }}
      newButtonLabel="New service"
      readOnly={isStylist}
      canCreate={!isStylist}
      canDelete={!isStylist}
      canEdit={!isStylist}
      prepareNew={(row) => ({
        ...row,
        type: row["type"] || "Single",
        comboItems: row["comboItems"] ?? "",
        productNeeds: row["productNeeds"] ?? "",
      })}
      extraToolbar={
        isStylist
          ? undefined
          : ({ openNew }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openNew({ type: "Combo", category: "Hair", comboItems: "", productNeeds: "" })}
        >
          <Layers /> New combo
        </Button>
      )
      }
      extraFields={({ editing, setEditing, rows }) => (
        <>
          <ComboPicker editing={editing} setEditing={setEditing} rows={rows} />
          <ProductNeedsPicker editing={editing} setEditing={setEditing} />
        </>
      )}
      validate={(row) => {
        if (String(row["type"]) !== "Combo") return null;
        const count = String(row["comboItems"] ?? "")
          .split(",")
          .filter(Boolean).length;
        if (count < 2) return "A combo needs at least two services.";
        if (!String(row["name"] ?? "").trim()) return "Give the combo a name.";
        return null;
      }}
      onSaved={(row) => syncRecipes(row)}
    />
  );
}
