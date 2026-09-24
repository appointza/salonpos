import { createFileRoute, redirect } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { getStoredSession } from "@/context/AuthContext";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    const user = getStoredSession();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: MainLayout,
});
