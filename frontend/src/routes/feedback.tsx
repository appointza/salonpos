import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { CrmSubnav } from "@/components/CrmSubnav";
import { useAuth } from "@/lib/auth";
import { modules } from "@/lib/modules";

const title = "Feedback — Luxe Salon CRM";
const description = "Track service ratings, NPS scores and the service-recovery pipeline.";

export const Route = createFileRoute("/feedback")({
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

function Page() {
  const { user } = useAuth();
  const isStylist = user?.role === "STYLIST";
  return (
    <div className="space-y-6">
      {!isStylist && <CrmSubnav />}
      <CrudPage
        module={{
          ...modules.feedback,
          subtitle: isStylist ? "Ratings left on your services only." : modules.feedback.subtitle,
        }}
        readOnly={isStylist}
        canCreate={!isStylist}
        canDelete={!isStylist}
        canEdit={!isStylist}
      />
    </div>
  );
}
