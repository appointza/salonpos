import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPage } from "@/components/CrudPage";
import { StockFlowNote } from "@/components/StockFlowNote";
import { modules } from "@/lib/modules";
import { useCollection, useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { useListView } from "@/lib/list-view";
import { signedQty, skuName, useStockService } from "@/lib/stock";

const title = "Inventory — Luxe Salon CRM";
const description = "Remaining stock is Opening + Purchases − Sales − Used. Movements are the audit trail.";

const TABS = [
  { key: "catalogue", label: "Products & balance" },
  { key: "ledger", label: "Stock movements" },
] as const;

function StockAdjustPanel({ editing }: { editing: Row }) {
  const stock = useStockService();
  const skuId = String(editing.id);
  const current = stock.remaining(skuId);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Stock received");

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Adjust stock</p>
        <p className="text-xs text-muted-foreground">
          Remaining for <strong>{String(editing["name"] || skuId)}</strong> is <strong>{current}</strong>. POS reads
          this balance — add a movement to increase or decrease stock.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="mb-1.5">Add quantity</Label>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 10" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5">Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={async () => {
          const n = Number(qty);
          if (!Number.isFinite(n) || n <= 0) return void toast.error("Enter a quantity to add");
          const result = await stock.adjust({ skuId, quantity: n, direction: "in", reason: reason.trim() || "Stock received" });
          if (!result.ok) {
            toast.error("error" in result ? String(result.error) : "Could not post movement");
            return;
          }
          const after = "remainingAfter" in result ? Number(result.remainingAfter) : current + n;
          toast.success(`Added ${n} to stock`, { description: `${String(editing["name"])} · ${after} remaining` });
          setQty("");
        }}
      >
        Post stock in
      </Button>
    </div>
  );
}

export function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("catalogue");
  const stock = useStockService();
  const { allRows } = useData();
  const { orgId } = useTenant();
  const inlineFields = modules.inventory.fields.filter((f) => f.table && f.name !== "stock").map((f) => f.name);
  const vendors = useMemo(
    () => (allRows["vendors"] ?? []).filter((v) => String(v["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const vendorOptions = useMemo(
    () => [
      { value: "0", label: "No preferred vendor" },
      ...vendors.map((v) => ({
        value: String(v.id),
        label: String(v["status"] ?? "Active") === "Inactive" ? `${String(v["name"])} (inactive)` : String(v["name"] ?? v.id),
      })),
    ],
    [vendors],
  );
  const vendorName = (id: string | number | undefined) => {
    if (!id || String(id) === "0") return "—";
    return vendorOptions.find((v) => v.value === String(id))?.label ?? String(id);
  };

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
          inlineEditable={inlineFields}
          selectOptions={(field) => (field.name === "vendorId" ? vendorOptions : undefined)}
          displayValue={(field, row) => {
            if (field.name === "stock") return String(stock.remaining(String(row.id)));
            if (field.name === "vendorId") return vendorName(row["vendorId"]);
            return undefined;
          }}
          extraFields={({ editing }) => <StockAdjustPanel editing={editing} />}
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
