import { CrudPage, type ModuleDef } from "@/components/CrudPage";

const invoicesModule: ModuleDef = {
  key: "invoices",
  title: "Invoices",
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
  return <CrudPage module={invoicesModule} canCreate={false} canEdit={false} canDelete={false} inlineEditable={false} />;
}
