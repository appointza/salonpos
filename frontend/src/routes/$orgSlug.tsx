import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/OrgSlug/OrgSlug";

const title = "Book online — Salon booking page";
const description = "Public salon booking page: pick a location, service and stylist, then confirm your appointment online.";

export const Route = createFileRoute("/$orgSlug")({
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
    links: [{ rel: "canonical", href: `https://ui-buddy-crud.lovable.app/${params.orgSlug}` }],
  }),
  component: Page,
});
