import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CrudPage } from "@/components/CrudPage";
import { StockFlowNote } from "@/components/StockFlowNote";
import { modules } from "@/lib/modules";
import { skuName, useStockService } from "@/lib/stock";

const title = "Expenses — Luxe Salon CRM";
const description = "Approved product purchases post a Purchase movement. Other categories never touch stock.";
const NONE = "__none__";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

function Page() {
  const stock = useStockService();

  return (
    <div className="space-y-6">
      <StockFlowNote />
      <CrudPage
        module={modules.expenses}
        displayValue={(field, row) => {
          if (field.name === "skuId") return row["skuId"] ? `${skuName(stock.skus, row["skuId"])} (${row["skuId"]})` : "—";
          return undefined;
        }}
        extraFields={({ editing, setEditing }) => {
          if (String(editing["category"]) !== "Purchase") return null;
          const skuId = String(editing["skuId"] ?? "");
          return (
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5">Product / SKU</Label>
                <Select
                  value={skuId || NONE}
                  onValueChange={(v) => setEditing({ ...editing, skuId: v === NONE ? "" : v, sku: v === NONE ? "" : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not a stock purchase</SelectItem>
                    {stock.skus.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {String(s["name"])} · {String(s.id)} · {stock.remaining(String(s.id))} remaining
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="exp-qty" className="mb-1.5">
                  Quantity received
                </Label>
                <Input
                  id="exp-qty"
                  type="number"
                  min={0}
                  value={Number(editing["quantity"] ?? 0)}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Approve once to add this qty. Approving again will not receive stock twice.
                </p>
              </div>
            </div>
          );
        }}
        validate={(row) => {
          if (String(row["category"]) !== "Purchase" || String(row["status"]) !== "Approved") return null;
          if (String(row["stockPosted"]) === "Yes") return null;
          if (!row["skuId"]) return "Pick the product this purchase received";
          if (Number(row["quantity"] ?? 0) <= 0) return "Enter quantity received";
          return null;
        }}
        onSaved={(row) => stock.receivePurchase(row)}
      />
    </div>
  );
}
