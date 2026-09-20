import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Setup/Setup";


export const Route = createFileRoute("/_app/setup")({
  head: () => ({
    meta: [{ title: "Easy setup — Krios" }, { name: "description", content: "Screen-by-screen salon setup wizard." }],
  }),
  component: Page,
});
