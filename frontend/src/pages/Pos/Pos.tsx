import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { PosTerminal } from "@/components/PosTerminal";
import { StockFlowNote } from "@/components/StockFlowNote";
import { useCollection, useData, type Row } from "@/store";
import { appointmentService } from "@/services/appointment.service";
import { toRow } from "@/entity-row";

const TABS = [
  { key: "sale", label: "New sale" },
  { key: "invoices", label: "Invoices" },
] as const;

const invoicesModule: ModuleDef = {
  key: "invoices",
  title: "POS & Billing",
  subtitle: "GST-compliant invoices, discounts, payments and refunds.",
  idPrefix: "INV-",
  fields: [
    { name: "customer", label: "Customer", type: "select", table: true },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "date", label: "Invoice date", type: "date", table: true },
    { name: "items", label: "Line items", type: "textarea", table: true },
    { name: "subtotal", label: "Subtotal", type: "number", money: true },
    { name: "discount", label: "Discount", type: "number", money: true },
    { name: "gstRate", label: "GST %", type: "select", options: ["0", "5", "12", "18", "28"] },
    { name: "tax", label: "Tax amount", type: "number", money: true },
    { name: "total", label: "Total", type: "number", money: true, table: true },
    {
      name: "payment",
      label: "Payment mode",
      type: "select",
      options: ["Cash", "Card", "UPI", "Wallet + Card", "Split"],
    },
    { name: "status", label: "Status", type: "select", options: ["Paid", "Unpaid", "Refunded"], table: true, badge: true },
  ],
};

export function Page() {
  const navigate = useNavigate({ from: "/_app/pos" });
  const { appointment: appointmentId } = useSearch({ from: "/_app/pos" });
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("sale");
  const [prefill, setPrefill] = useState<Row | null>(null);
  const billedAppointment = useRef<string | null>(null);
  const { allRows, orgId } = useData();
  const { rows: appointments } = useCollection("appointments", {
    autoload: Boolean(appointmentId),
    refetchOnMount: Boolean(appointmentId),
  });

  function clearAppointmentSearch() {
    void navigate({ search: { appointment: undefined }, replace: true });
  }

  useEffect(() => {
    if (!appointmentId) return;
    const wanted = String(appointmentId).replace(/^["']+|["']+$/g, "").trim();
    if (!wanted) return;
    if (billedAppointment.current === wanted) return;
    const pool = (allRows["appointments"] ?? []).length ? allRows["appointments"] ?? [] : appointments;
    const match = pool.find((a) => String(a.id) === wanted);
    if (match) {
      const status = String(match["status"] ?? "");
      if (["Completed", "Cancelled", "No-show"].includes(status)) {
        setPrefill(null);
        clearAppointmentSearch();
        return;
      }
      setPrefill(match);
      setTab("sale");
      return;
    }
    const oid = Number(orgId);
    const aid = Number(wanted);
    if (!oid || !Number.isFinite(aid) || aid <= 0) return;
    let cancelled = false;
    void appointmentService
      .select({ orgId: oid, id: aid })
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => String(r.id) === wanted) ?? rows[0];
        if (!row) return;
        const status = String(row.status ?? row["status"] ?? "");
        if (["Completed", "Cancelled", "No-show"].includes(status)) {
          setPrefill(null);
          clearAppointmentSearch();
          return;
        }
        setPrefill(toRow(row as unknown as Record<string, unknown>));
        setTab("sale");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [appointmentId, appointments, allRows, orgId]);

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
      {tab === "sale" && <StockFlowNote />}

      {tab === "sale" && (
        <PosTerminal
          key={prefill ? String(prefill.id) : "walk-in"}
          prefill={prefill}
          onBilled={() => {
            if (prefill) billedAppointment.current = String(prefill.id);
            setPrefill(null);
            clearAppointmentSearch();
          }}
        />
      )}

      {tab === "invoices" && (
        <CrudPage
          module={invoicesModule}
          hideTitle
          canCreate={false}
          canEdit={false}
          canDelete={false}
          inlineEditable={false}
        />
      )}
    </div>
  );
}
