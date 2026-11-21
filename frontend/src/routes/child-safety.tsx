import { createFileRoute } from "@tanstack/react-router";
import { CHILD_SAFETY_EMAIL } from "@/brand";
import { ChildSafetyPage } from "@/pages/Legal/ChildSafety";

const title = "Child Safety Standards — Kriosapp";
const description = `Kriosapp child safety policy: zero tolerance for CSAE and CSAM, how to report, review process, and ${CHILD_SAFETY_EMAIL}.`;

export const Route = createFileRoute("/child-safety")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ChildSafetyPage,
});
