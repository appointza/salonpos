import { useCallback } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export type BillLine = {
  id: string;
  kind: "service" | "product";
  name: string;
  price: number;
  gstRate: number;
  qty: number;
  commission: number;
  staff: string;
};

export type SaleInput = {
  customer: Row;
  lines: BillLine[];
  discount: number;
  membershipDiscount: number;
  pointsRedeemed: number;
  payment: string;
  appointmentId?: string;
};

export function billTotals(lines: BillLine[], discount: number, membershipDiscount: number, pointsRedeemed: number) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const deductions = Math.min(discount + membershipDiscount + pointsRedeemed, subtotal);
  const taxable = Math.max(subtotal - deductions, 0);
  const tax = lines.reduce((s, l) => {
    const share = subtotal ? (l.price * l.qty) / subtotal : 0;
    return s + taxable * share * (l.gstRate / 100);
  }, 0);
  return { subtotal, deductions, taxable, tax, total: taxable + tax };
}

export const AUDIT = "auditLog";

/**
 * Posts a completed sale across the connected modules: invoice, inventory stock,
 * staff commission, customer loyalty/history, membership usage, appointment status
 * and the audit trail — all stamped with the active org + location.
 */
export function usePostSale() {
  const { db, create, update } = useData();
  const { org, location, locationId } = useTenant();

  return useCallback(
    (input: SaleInput) => {
      const { customer, lines, discount, membershipDiscount, pointsRedeemed, payment, appointmentId } = input;
      const t = billTotals(lines, discount, membershipDiscount, pointsRedeemed);
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const today = stamp.slice(0, 10);
      const outlet = location?.name ?? String(customer["outlet"] ?? "All");
      const effLocation = locationId === "all" ? String(customer["locationId"] ?? org.locations[0]?.locationId ?? "") : locationId;

      const invoice: Row = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: String(customer["name"] ?? ""),
        customerPhone: String(customer["phone"] ?? ""),
        outlet,
        date: today,
        items: lines.map((l) => `${l.name} x${l.qty}`).join(", "),
        subtotal: Math.round(t.subtotal),
        discount: Math.round(discount),
        membershipDiscount: Math.round(membershipDiscount),
        pointsRedeemed: Math.round(pointsRedeemed),
        gstRate: lines[0]?.gstRate ?? 18,
        tax: Math.round(t.tax),
        total: Math.round(t.total),
        payment,
        appointment: appointmentId ?? "",
        status: "Paid",
        locationId: effLocation,
      };
      create("invoices", invoice);

      // Inventory: product sales reduce stock at the selling location.
      for (const line of lines.filter((l) => l.kind === "product")) {
        const sku = (db["inventory"] ?? []).find((r) => String(r.id) === line.id);
        if (!sku) continue;
        update("inventory", String(sku.id), {
          ...sku,
          stock: Math.max(Number(sku["stock"] ?? 0) - line.qty, 0),
        });
        create(AUDIT, {
          id: `AU-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          at: stamp,
          entity: "Inventory",
          reference: String(sku.id),
          action: "Stock out (sale)",
          detail: `${line.name} −${line.qty} · ${invoice.id}`,
          locationId: effLocation,
        });
      }

      // Staff commission per service line.
      for (const line of lines.filter((l) => l.kind === "service" && l.staff)) {
        const base = line.price * line.qty;
        create("commissions", {
          id: `CM-${Math.floor(10000 + Math.random() * 89999)}`,
          staff: line.staff,
          invoice: String(invoice.id),
          type: "Service",
          item: line.name,
          baseAmount: base,
          rate: line.commission,
          amount: Math.round((base * line.commission) / 100),
          date: today,
          status: "Pending",
          locationId: effLocation,
        });
      }

      // Loyalty: earn 1 point per ₹100 spent, minus points redeemed.
      const earned = Math.floor(t.total / 100);
      update("customers", String(customer.id), {
        ...customer,
        points: Math.max(Number(customer["points"] ?? 0) - pointsRedeemed + earned, 0),
        lastVisit: today,
        visits: Number(customer["visits"] ?? 0) + 1,
        lifetimeValue: Number(customer["lifetimeValue"] ?? 0) + Math.round(t.total),
      });

      // Membership usage.
      if (membershipDiscount > 0) {
        const mem = (db["memberships"] ?? []).find(
          (m) => String(m["customer"]) === String(customer["name"]) && String(m["status"]) === "Active",
        );
        if (mem) update("memberships", String(mem.id), { ...mem, used: Number(mem["used"] ?? 0) + 1 });
      }

      // Appointment closes the loop.
      if (appointmentId) {
        const appt = (db["appointments"] ?? []).find((a) => String(a.id) === appointmentId);
        if (appt) update("appointments", appointmentId, { ...appt, status: "Completed", invoice: String(invoice.id) });
      }

      create(AUDIT, {
        id: `AU-${Date.now()}`,
        at: stamp,
        entity: "Invoice",
        reference: String(invoice.id),
        action: "Bill generated",
        detail: `${String(customer["name"])} · ₹${Math.round(t.total)} · ${payment} · +${earned} pts`,
        locationId: effLocation,
      });

      return { invoice, totals: t, earned };
    },
    [db, create, update, org, location, locationId],
  );
}
