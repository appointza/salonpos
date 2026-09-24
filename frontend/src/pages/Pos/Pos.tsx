import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Receipt, CalendarCheck } from "lucide-react";
import { CrudPage } from "@/components/CrudPage";
import { PosTerminal } from "@/components/PosTerminal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockFlowNote } from "@/components/StockFlowNote";
import { modules } from "@/lib/modules";
import { useCollection, type Row } from "@/lib/store";

const title = "POS & Billing — Luxe Salon CRM";
const description = "Search customers by phone, bill services and products, and send receipts on WhatsApp.";

const TABS = [
  { key: "sale", label: "New sale" },
  { key: "queue", label: "Appointments to bill" },
  { key: "invoices", label: "Invoices" },
] as const;

export function Page() {
  const { appointment: appointmentId } = useSearch({ from: "/_app/pos" });
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("sale");
  const [prefill, setPrefill] = useState<Row | null>(null);
  const { rows: appointments } = useCollection("appointments");

  useEffect(() => {
    if (!appointmentId) return;
    const wanted = String(appointmentId).replace(/^["']+|["']+$/g, "").trim();
    const match = appointments.find((a) => String(a.id) === wanted);
    if (!match) return;
    setPrefill(match);
    setTab("sale");
  }, [appointmentId, appointments]);

  const pending = appointments.filter((a) => ["Confirmed", "Pending"].includes(String(a["status"])));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">POS & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Bill a customer; product lines reduce remaining stock and record who used them.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
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
      </header>
      <StockFlowNote />

      {tab === "sale" && (
        <PosTerminal
          key={prefill ? String(prefill.id) : "walk-in"}
          prefill={prefill}
          onBilled={() => setPrefill(null)}
        />
      )}

      {tab === "queue" && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {pending.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No open appointments at this location.</p>
          ) : (
            pending.map((a) => (
              <div key={String(a.id)} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {String(a["customer"])} · {String(a["service"])}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(a["date"])} {String(a["time"])} · {String(a["staff"])} · {String(a["outlet"])}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{String(a["status"])}</Badge>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPrefill(a);
                      setTab("sale");
                    }}
                  >
                    <Receipt /> Complete & bill
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "invoices" && <CrudPage module={modules.invoices} />}
    </div>
  );
}
