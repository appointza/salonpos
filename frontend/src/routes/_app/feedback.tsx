import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Feedback/Feedback";

const title = "Feedback — Luxe Salon CRM";
const description = "Track service ratings, NPS scores and the service-recovery pipeline.";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});
