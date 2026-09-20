export type SetupStep = {
  key: string;
  title: string;
  description: string;
  to: string;
};

export const SETUP_STEPS: SetupStep[] = [
  {
    key: "services",
    title: "Add your services",
    description: "Create service menu, prices and GST rates for POS and online booking.",
    to: "/services",
  },
  {
    key: "staff",
    title: "Add staff",
    description: "Add stylists and reception with roles, commission and documents.",
    to: "/staff",
  },
  {
    key: "shifts",
    title: "Plan shifts & roster",
    description: "Publish weekly rosters so attendance and appointments stay accurate.",
    to: "/shifts",
  },
  {
    key: "inventory",
    title: "Stock & vendors",
    description: "Add products, vendors and reorder levels before your first purchase.",
    to: "/vendors",
  },
  {
    key: "loyalty",
    title: "Loyalty & rewards",
    description: "Turn on points, wheel and scratch card for walk-ins and bookings.",
    to: "/loyalty",
  },
  {
    key: "booking",
    title: "Public booking link",
    description: "Share your guest booking page and walk-in kiosk with customers.",
    to: "/settings",
  },
];
