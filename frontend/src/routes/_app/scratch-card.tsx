import { createFileRoute } from "@tanstack/react-router";
import { ScratchCardPage } from "@/pages/ScratchCard/ScratchCard";

const title = "Scratch card — Krios";
const description = "Configure scratch-card prizes, tiers and weights for guest reveals.";

export const Route = createFileRoute("/_app/scratch-card")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ScratchCardPage,
});
