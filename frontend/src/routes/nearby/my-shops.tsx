import { createFileRoute } from "@tanstack/react-router";
import { MyShopsPage } from "@/pages/NearbyMyShops/NearbyMyShops";

const title = "My shops & rewards — Krios";
const description = "See points, stamps and coupons at every salon you've visited.";

export const Route = createFileRoute("/nearby/my-shops")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MyShopsPage,
});
