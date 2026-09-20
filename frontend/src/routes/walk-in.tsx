import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/WalkIn/WalkIn";

const title = "Walk-in check-in — Krios";
const description = "Enter your details, check in, and spin the wheel or scratch your daily reward card.";

export const Route = createFileRoute("/walk-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    org: typeof search.org === "string" ? search.org : undefined,
    loc: typeof search.loc === "string" ? search.loc : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});
