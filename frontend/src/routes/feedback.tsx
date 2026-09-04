import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { GoogleReviewsPanel } from "@/components/GoogleReviewsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs defaultValue="salon">
        <TabsList>
          <TabsTrigger value="salon">In salon</TabsTrigger>
          <TabsTrigger value="google">Google Maps</TabsTrigger>
        </TabsList>
        <TabsContent value="salon" className="mt-6">
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
        </TabsContent>
        <TabsContent value="google" className="mt-6">
          <GoogleReviewsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
