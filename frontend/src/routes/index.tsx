import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home/Home";

const title = "Kriosapp | Salon & Spa Management Software, CRM & Loyalty Program";
const description =
  "Kriosapp is an all-in-one salon and spa management platform with CRM, appointment booking, inventory, staff management, WhatsApp marketing, subscriptions, and loyalty programs. Manage your salon with Krios Desk and retain customers with Krios Points.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Home,
});
