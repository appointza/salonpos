import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";
import { useCollection } from "@/lib/store";
import { useListView } from "@/lib/list-view";
import { useLoyaltySettings } from "@/lib/loyalty-settings";

const title = "Loyalty — Luxe Salon CRM";
const description = "Program rules drive POS earn/redeem. The ledger is written only at checkout.";

export const Route = createFileRoute("/loyalty")({
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

const TABS = [
  { key: "programs", label: "Programs" },
  { key: "ledger", label: "Point ledger" },
] as const;

function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("programs");
  const { settings } = useLoyaltySettings();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        POS uses <strong>{settings.name}</strong>: {settings.pointsPerUnit} pt / ₹{settings.earnUnitRupees}, 1 pt = ₹
        {settings.rupeesPerPoint}, min spend ₹{settings.minSpend}. Points are not edited on the customer screen — they
        move through this ledger when a bill is generated.
      </p>
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
      {tab === "programs" ? (
        <CrudPage
          module={modules.loyalty}
          prepareSave={(row) => ({
            ...row,
            earnRate: `${Math.max(1, Number(row["pointsPerUnit"]) || 1)} pt / ₹${Math.max(1, Number(row["earnUnitRupees"]) || 100)}`,
            redeemValue: `1 pt = ₹${Math.max(0, Number(row["rupeesPerPoint"]) || 0)}`,
          })}
        />
      ) : (
        <Ledger />
      )}
    </div>
  );
}

function Ledger() {
  const { view } = useListView();
  const { rows: txs } = useCollection("loyaltyTransactions");
  const { rows: customers } = useCollection("customers");
  const nameOf = (id: string) => customers.find((c) => String(c.id) === id)?.["name"] ?? id;

  if (txs.length === 0) {
    return <p className="text-sm text-muted-foreground">No loyalty transactions yet. Complete a POS sale.</p>;
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {txs.map((t) => (
          <div key={String(t.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <p className="font-medium">{String(nameOf(String(t["customerId"])))}</p>
              <Badge variant="secondary">{String(t["type"])}</Badge>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{String(t["customerId"])}</p>
            <p className="mt-2 text-sm">
              {String(t["type"]) === "Earn" ? "+" : "−"}
              {Number(t["points"] ?? 0)} pts
            </p>
            <p className="text-xs text-muted-foreground">
              {String(t["balanceBefore"])} → {String(t["balanceAfter"])} · {String(t["invoiceId"] ?? "")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{String(t["reason"] ?? "")}</p>
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
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.map((t) => (
            <TableRow key={String(t.id)}>
              <TableCell>
                {String(nameOf(String(t["customerId"])))}
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(t["customerId"])}</span>
              </TableCell>
              <TableCell className="font-mono text-xs">{String(t["invoiceId"] ?? "")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{String(t["type"])}</Badge>
              </TableCell>
              <TableCell>
                {String(t["type"]) === "Earn" ? "+" : "−"}
                {Number(t["points"] ?? 0)}
              </TableCell>
              <TableCell className="text-xs">
                {String(t["balanceBefore"])} → {String(t["balanceAfter"])}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{String(t["reason"] ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
