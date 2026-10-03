import { CrudPage, type ModuleDef } from "@/components/CrudPage";

const title = "Staff — Luxe Salon CRM";
const description = "Maintain staff records with salary, commission rates and monthly targets.";

const module: ModuleDef = {
  key: "staff",
  title: "Staff",
  subtitle: "Each person belongs to one organisation and one outlet. Shifts, leave, attendance and pay use that outlet.",
  idPrefix: "ST-",
  fields: [
    { name: "name", label: "Name", table: true },
    {
      name: "role",
      label: "Role",
      type: "select",
      options: ["Senior Stylist", "Hair Specialist", "Barber", "Beautician", "Outlet Manager", "Receptionist"],
      table: true,
    },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "phone", label: "Phone", table: true },
    { name: "email", label: "Email" },
    { name: "joinDate", label: "Joining date", type: "date" },
    { name: "baseSalary", label: "Base salary", type: "number", money: true, table: true },
    { name: "commissionRate", label: "Commission %", type: "number" },
    { name: "target", label: "Monthly target", type: "number", money: true, table: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Inactive"], table: true, badge: true },
    { name: "address", label: "Address", type: "textarea" },
    { name: "bankName", label: "Bank name" },
    { name: "bankAccount", label: "Bank account no.", table: true },
    { name: "bankIfsc", label: "IFSC" },
    { name: "idProofType", label: "ID proof type", type: "select", options: ["Aadhaar", "PAN", "Passport", "Driving licence", "Other"] },
    { name: "idProofRef", label: "ID proof ref" },
    { name: "addressProofType", label: "Address proof", type: "select", options: ["Aadhaar", "Utility bill", "Rent agreement", "Other"] },
    { name: "addressProofRef", label: "Address proof ref" },
  ],
};

export function Page() {
  return <CrudPage module={module} />;
}
