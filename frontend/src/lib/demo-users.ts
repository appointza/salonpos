import type { Role } from "@/lib/auth";
import { DEMO_ORG_ID } from "@/lib/tenant";

export type DemoKind = "workspace" | "customer";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  kind: DemoKind;
  title: string;
  outlet: string;
  orgId: string | null;
  password: string;
};

export const DEMO_ROLE_GROUPS: { role: Role | "CUSTOMER"; label: string; hint: string; users: DemoUser[] }[] = [
  {
    role: "ADMIN",
    label: "Admin",
    hint: "Full organisation workspace",
    users: [
      {
        id: "U-01",
        name: "Kunal Shah",
        email: "kunal@salon.com",
        phone: "+91 98330 10102",
        role: "ADMIN",
        kind: "workspace",
        title: "Owner",
        outlet: "All outlets",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
    ],
  },
  {
    role: "STAFF",
    label: "Staff",
    hint: "Front desk, POS, CRM and inventory",
    users: [
      {
        id: "U-02",
        name: "Sneha Joshi",
        email: "sneha@salon.com",
        role: "STAFF",
        kind: "workspace",
        title: "Franchise manager",
        outlet: "Koregaon Park",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
    ],
  },
  {
    role: "STYLIST",
    label: "Stylist",
    hint: "Appointments, clients, shifts and leave",
    users: [
      {
        id: "U-03",
        name: "Ritu Nair",
        email: "ritu@salon.com",
        phone: "+91 98201 33445",
        role: "STYLIST",
        kind: "workspace",
        title: "Senior stylist",
        outlet: "Bandra Flagship",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
      {
        id: "ST-102",
        name: "Imran Shaikh",
        email: "imran@salon.com",
        phone: "+91 99870 21134",
        role: "STYLIST",
        kind: "workspace",
        title: "Barber",
        outlet: "Bandra Flagship",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
    ],
  },
  {
    role: "SUPER_ADMIN",
    label: "Super admin",
    hint: "Platform console for every organisation",
    users: [
      {
        id: "U-SA",
        name: "Priya Mehta",
        email: "platform@kriosapp.com",
        role: "SUPER_ADMIN",
        kind: "workspace",
        title: "Platform operator",
        outlet: "All organisations",
        orgId: null,
        password: "demo123",
      },
    ],
  },
  {
    role: "CUSTOMER",
    label: "Customer",
    hint: "Find salons and book",
    users: [
      {
        id: "C-1002",
        name: "Neha Kulkarni",
        email: "neha.k@example.com",
        phone: "+91 99303 55412",
        role: "ADMIN",
        kind: "customer",
        title: "Platinum member",
        outlet: "Koregaon Park",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
      {
        id: "C-1001",
        name: "Aarti Sharma",
        email: "aarti.sharma@example.com",
        phone: "+91 98200 11223",
        role: "ADMIN",
        kind: "customer",
        title: "Gold member",
        outlet: "Bandra Flagship",
        orgId: DEMO_ORG_ID,
        password: "demo123",
      },
    ],
  },
];
