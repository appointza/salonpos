import { createFileRoute } from "@tanstack/react-router";
import { PrizeWheelPage } from "@/pages/PrizeWheel/PrizeWheel";

const title = "Guest prizes — Krios";
const description = "One prize list for the walk-in and public booking game (spin wheel or scratch card).";

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
