import { CrudPage, type ModuleDef } from "@/components/CrudPage";

const module: ModuleDef = {
  key: "vendors",
  title: "Vendors",
  subtitle: "Suppliers for retail and back-bar purchases.",
  idPrefix: "VEN-",
  fields: [
    { name: "name", label: "Vendor name", table: true },
    { name: "contact", label: "Contact person", table: true },
    { name: "phone", label: "Phone", table: true },
    { name: "email", label: "Email" },
    { name: "gstin", label: "GSTIN" },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: ["Products", "Equipment", "Utilities", "Rent", "Marketing", "Other"],
      table: true,
      badge: true,
    },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], table: true, badge: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};

export function Page() {
  return <CrudPage module={module} />;
}
