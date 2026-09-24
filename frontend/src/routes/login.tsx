import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/Login/Login";

const title = "Sign in — Krios";
const description = "Sign in to your salon workspace or book as a customer.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LoginPage,
});
