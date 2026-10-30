import { createFileRoute, redirect } from "@tanstack/react-router";
import { Home } from "@/pages/Home/Home";
import { getStoredSession } from "@/context/AuthContext";
import { readCustomerSession, workspaceHomePath } from "@/session";

const title = "Salon & Spa Management Software with CRM & Loyalty | Kriosapp";
const description =
  "Kriosapp is all-in-one salon and spa software: appointment booking, CRM, POS, inventory, staff, WhatsApp marketing, memberships and a built-in loyalty program with spin wheel, scratch cards and coupons.";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const user = getStoredSession();
    if (user) throw redirect({ to: workspaceHomePath(user.role) });
    if (readCustomerSession()) throw redirect({ to: "/nearby" });
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "keywords", content: "salon management software, spa management software, salon CRM, salon POS, salon loyalty program, salon appointment booking, WhatsApp marketing for salons, salon software India" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Kriosapp" },
      { property: "og:url", content: "https://kriosapp.com/" },
      { property: "og:title", content: "Kriosapp — Salon & Spa Management Software with Built-in Loyalty" },
      { property: "og:description", content: "Run appointments, customers, staff, inventory and marketing from one place — and bring clients back with loyalty points, spin wheels and coupons." },
      { property: "og:image", content: "https://kriosapp.com/krios-logo.png" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Kriosapp — Salon & Spa Management Software" },
      { name: "twitter:description", content: "Salon CRM, booking, POS and loyalty rewards in one connected platform." },
    ],
    links: [{ rel: "canonical", href: "https://kriosapp.com/" }],
  }),
  component: Home,
});
