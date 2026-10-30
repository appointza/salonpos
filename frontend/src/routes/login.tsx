import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredSession } from "@/context/AuthContext";
import { LoginPage } from "@/pages/Login/Login";
import { readCustomerSession, workspaceHomePath } from "@/session";

const title = "Sign in — Krios";
const description = "Sign in to your salon workspace or book as a customer.";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const user = getStoredSession();
    if (user) throw redirect({ to: workspaceHomePath(user.role) });
    if (readCustomerSession()) throw redirect({ to: "/nearby" });
  },
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
