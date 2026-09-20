import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPage } from "@/components/CrudPage";
import { StockFlowNote } from "@/components/StockFlowNote";
import { modules } from "@/lib/modules";
import { useCollection } from "@/lib/store";
import { useListView } from "@/lib/list-view";
import { signedQty, skuName, useStockService } from "@/lib/stock";

const title = "Inventory — Luxe Salon CRM";
const description = "Remaining stock is Opening + Purchases − Sales − Used. Movements are the audit trail.";

const TABS = [
  { key: "catalogue", label: "Products & balance" },
  { key: "ledger", label: "Stock movements" },
] as const;

export function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("catalogue");
  const stock = useStockService();
  return (
    <div className="space-y-6">
      <StockFlowNote />
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "catalogue" ? (
        <CrudPage
          module={modules.inventory}
          displayValue={(field, row) => {
            if (field.name === "stock") return String(stock.remaining(String(row.id)));
            return undefined;
          }}
          extraFields={({ editing }) => (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Remaining for {String(editing["name"] || editing.id)} is {stock.remaining(String(editing.id))} (from
              movements, not typed here).
            </p>
          )}
        />
      ) : (
        <MovementLedger />
      )}
    </div>
  );
}

function MovementLedger() {
  const { view } = useListView();
  const stock = useStockService();
  const { rows: customers } = useCollection("customers");
  const nameOf = (id: string) => {
    if (!id) return "—";
    return String(customers.find((c) => String(c.id) === id)?.["name"] ?? id);
  };
  const txs = [...stock.movements].sort((a, b) => String(a["date"] ?? a["createdon"] ?? "").localeCompare(String(b["date"] ?? b["createdon"] ?? "")));

  const qtyLabel = (t: (typeof txs)[number]) => {
    const n = signedQty(t);
    return n > 0 ? `+${n}` : String(n);
  };

  if (txs.length === 0) {
    return <p className="text-sm text-muted-foreground">No stock movements yet.</p>;
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {txs.map((t) => (
          <div key={String(t.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <p className="font-medium">{String(t["skuName"] ?? skuName(stock.skus, t["skuId"]))}</p>
              <Badge variant="secondary">{String(t["type"])}</Badge>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{String(t["sku"] ?? t["skuId"])}</p>
            <p className="mt-2 text-sm">
              {qtyLabel(t)} · remaining {String(t["balanceAfter"] ?? stock.remaining(String(t["skuId"])))}
            </p>
            <p className="text-xs text-muted-foreground">
              {String(t["date"] ?? t["createdon"] ?? "")} · {nameOf(String(t["customerId"] ?? ""))}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Customer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.map((t) => (
            <TableRow key={String(t.id)}>
              <TableCell>{String(t["date"] ?? t["createdon"] ?? "—")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{String(t["type"])}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{String(t["sku"] ?? t["skuId"])}</TableCell>
              <TableCell>{String(t["skuName"] ?? skuName(stock.skus, t["skuId"]))}</TableCell>
              <TableCell className="text-right">{qtyLabel(t)}</TableCell>
              <TableCell>{nameOf(String(t["customerId"] ?? ""))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
