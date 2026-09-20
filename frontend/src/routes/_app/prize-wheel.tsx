import { createFileRoute } from "@tanstack/react-router";
import { PrizeWheelPage } from "@/pages/PrizeWheel/PrizeWheel";

const title = "Prize wheel — Krios";
const description = "Configure wheel segments, prize tiers and weights for guest spins.";

export const Route = createFileRoute("/_app/prize-wheel")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrizeWheelPage,
});
