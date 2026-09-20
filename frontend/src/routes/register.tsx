import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/pages/Register/Register";

const title = "Create an account — Luxe Salon CRM";
const description =
  "Sign up as a customer to book nearby salons, or register your business and complete the guided onboarding wizard.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RegisterPage,
});
