import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Book/Book";

const title = "Book or buy a membership — Luxe Salon";
const description = "Book an appointment or purchase a salon membership online.";

export const Route = createFileRoute("/book")({
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
