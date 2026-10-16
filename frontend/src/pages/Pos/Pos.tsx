import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { PosTerminal } from "@/components/PosTerminal";
import { StockFlowNote } from "@/components/StockFlowNote";
import { useT } from "@/i18n/LanguageContext";
import { useCollection, useData, type Row } from "@/store";
import { appointmentService } from "@/services/appointment.service";
import { toRow } from "@/entity-row";

export function Page() {
  const t = useT();
  const navigate = useNavigate();
  const { appointment: appointmentId } = useSearch({ from: "/_app/pos" });
  const [prefill, setPrefill] = useState<Row | null>(null);
  const [saleKey, setSaleKey] = useState(0);
  const billedAppointment = useRef<string | null>(null);
  const { allRows, orgId } = useData();
  const { rows: appointments } = useCollection("appointments", {
    autoload: Boolean(appointmentId),
    refetchOnMount: Boolean(appointmentId),
  });

  function stayOnPosScreen() {
    void navigate({ to: "/pos", search: { appointment: undefined }, replace: true });
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
        stayOnPosScreen();
        return;
      }
      setPrefill(match);
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
          stayOnPosScreen();
          return;
        }
        setPrefill(toRow(row as unknown as Record<string, unknown>));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [appointmentId, appointments, allRows, orgId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t("POS")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Bill a customer; product lines reduce remaining stock and record who used them.")}
        </p>
      </header>
      <StockFlowNote />
      <PosTerminal
        key={prefill ? `appt-${prefill.id}` : `sale-${saleKey}`}
        prefill={prefill}
        onBilled={() => {
          if (prefill) billedAppointment.current = String(prefill.id);
          setPrefill(null);
          setSaleKey((n) => n + 1);
          if (appointmentId) stayOnPosScreen();
        }}
      />
    </div>
  );
}
