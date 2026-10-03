import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { GoogleReviewsPanel } from "@/components/GoogleReviewsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

const title = "Feedback — Luxe Salon CRM";
const description = "Track service ratings, NPS scores and the service-recovery pipeline.";

const feedbackModule: ModuleDef = {
  key: "feedback",
  title: "Feedback",
  subtitle: "Ratings, NPS and service recovery pipeline.",
  idPrefix: "FB-",
  fields: [
    { name: "customer", label: "Customer", type: "select", table: true },
    { name: "invoice", label: "Invoice" },
    { name: "staff", label: "Staff", type: "select", table: true },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "date", label: "Date", type: "date", table: true },
    { name: "rating", label: "Rating (1-5)", type: "number", table: true },
    { name: "nps", label: "NPS (0-10)", type: "number" },
    { name: "channel", label: "Channel", type: "select", options: ["WhatsApp", "SMS", "Email", "App"] },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["New", "Recovery Open", "Review Requested", "Closed"],
      table: true,
      badge: true,
    },
    { name: "comment", label: "Comment", type: "textarea", table: true },
  ],
};

export function Page() {
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
              ...feedbackModule,
              subtitle: isStylist ? "Ratings left on your services only." : feedbackModule.subtitle,
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
