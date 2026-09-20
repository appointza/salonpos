import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/OrgWalkIn/OrgWalkIn";

const title = "Walk-in check-in — Salon";
const description = "Check in as a walk-in guest and play the configured daily reward game.";

export const Route = createFileRoute("/$orgSlug/walk-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    loc: typeof search.loc === "string" ? search.loc : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `/${params.orgSlug}/walk-in` }],
  }),
  component: Page,
});
