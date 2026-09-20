import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home/Home";

const title = "Krios — All-in-one platform for salons & studios";
const description =
  "Manage QR codes, digital menus, services, customers, appointments, loyalty, rewards, check-ins, WhatsApp ordering, staff, analytics and subscriptions in one multi-tenant platform.";

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
