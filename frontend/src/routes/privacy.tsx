import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPolicyPage } from "@/pages/Legal/PrivacyPolicy";

const title = "Privacy Policy — Kriosapp";
const description =
  "How Kriosapp collects and uses salon and guest data, and how you can delete your account.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrivacyPolicyPage,
});
