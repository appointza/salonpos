import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/pages/ForgotPassword/ForgotPassword";

const title = "Forgot password — Krios";
const description = "Verify with a code sent to your email, then set a new password.";

function parseIdentifier(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    identifier: parseIdentifier(search.identifier),
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ForgotPasswordPage,
});
