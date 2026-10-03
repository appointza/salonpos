import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CrudPage } from "@/components/CrudPage";
import { ServiceMatchField } from "@/components/ServiceMatchField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatServiceSpec } from "@/pages/Memberships/membership";
import { customerName } from "@/pages/Customers/customer-lookup";
import { issueOfferToCustomer, listOfferClaims } from "@/pages/Offers/offer-redemption-service";
import { useCollection, useData, type Row } from "@/store";
import { useTenant } from "@/tenant";

const title = "QR Offers — Luxe Salon CRM";
const description = "Birthday, welcome and tier offers shown after customer check-in.";

export function OffersPage() {
  const { org, locationId, orgId } = useTenant();
  const { allRows, create } = useData();
  const { rows: customers } = useCollection("customers");
  const { rows: offerRows } = useCollection("qrOffers");
  const [tab, setTab] = useState("schemes");
  const [statusFilter, setStatusFilter] = useState<"All" | "Issued" | "Redeemed">("All");
  const [issueOfferId, setIssueOfferId] = useState<string | null>(null);
  const [issueCustomerId, setIssueCustomerId] = useState("");

  const services = (allRows["services"] ?? []).filter(
    (s) => String(s["orgId"]) === String(orgId) && String(s["active"] ?? "Yes") !== "No",
  );

  const locName = (id: string) => {
    if (!id || id === "0") return "—";
    return org.locations.find((l) => String(l.locationId) === String(id))?.name ?? id;
  };

  const claims = useMemo(
    () =>
      listOfferClaims(allRows, { orgId: org.orgId, locationId }).sort((a, b) =>
        String(b["redeemedAt"] || b["issuedAt"] || "").localeCompare(String(a["redeemedAt"] || a["issuedAt"] || "")),
      ),
    [allRows, org.orgId, locationId],
  );

  const filteredClaims = useMemo(() => {
    if (statusFilter === "All") return claims;
    return claims.filter((r) => String(r["status"] ?? "") === statusFilter);
  }, [claims, statusFilter]);

  const issueOffer = issueOfferId ? offerRows.find((o) => String(o.id) === issueOfferId) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight text-foreground">QR offers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Create offer schemes here. After QR check-in (or Issue below), a claim appears on the Claims tab. Staff apply
          it at POS; redeemed claims stay on that list.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="schemes">Offer schemes</TabsTrigger>
          <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="schemes" className="mt-4">
          <CrudPage
            hideTitle
            extraToolbar={() =>
              offerRows.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setIssueOfferId(String(offerRows[0]?.id ?? ""))}>
                  Issue to customer
                </Button>
              ) : null
            }
            module={{
              key: "qrOffers",
              title: "QR offers",
              subtitle: description,
              idPrefix: "QO-",
              fields: [
                { name: "title", label: "Title", table: true },
                { name: "description", label: "Description", table: true },
                {
                  name: "offerType",
                  label: "Type",
                  type: "select",
                  options: ["% off", "Flat off", "Free item", "Free service"],
                  table: true,
                },
                { name: "serviceName", label: "Free / bundle service", table: true },
                {
                  name: "eligibleSegment",
                  label: "Segment",
                  type: "select",
                  options: ["All", "Birthday", "New customer", "Gold", "Platinum"],
                  table: true,
                },
                { name: "validityStart", label: "Starts", type: "date", table: true },
                { name: "validityEnd", label: "Ends", type: "date", table: true },
                {
                  name: "status",
                  label: "Status",
                  type: "select",
                  options: ["Draft", "Active", "Paused", "Expired"],
                  table: true,
                  badge: true,
                },
              ],
            }}
            displayValue={(field, row) => {
              if (field.name === "serviceName") return formatServiceSpec(row["serviceName"], services) || undefined;
              return undefined;
            }}
            renderFormField={(field, editing, setEditing) => {
              if (field.name !== "serviceName") return undefined;
              const type = String(editing["offerType"] ?? "");
              if (type !== "Free service" && type !== "Free item" && type !== "Buy X get free") {
                return null;
              }
              return (
                <ServiceMatchField
                  id="serviceName"
                  label="Which service is this offer for?"
                  hint="Pick from the menu. The offer follows the service id, not the spelling of the name."
                  value={String(editing["serviceName"] ?? "")}
                  onChange={(v) => setEditing({ ...editing, serviceName: v })}
                  services={services}
                  single
                />
              );
            }}
          />
        </TabsContent>

        <TabsContent value="claims" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Issued at check-in or from Issue. Redeemed when the offer is applied on a POS bill.
            </p>
            <div className="flex flex-wrap gap-1">
              {(["All", "Issued", "Redeemed"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "ghost"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {filteredClaims.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No claim records yet. Active offers are issued when a matching guest checks in, or use Issue to customer
              on the schemes tab. They redeem at POS.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((row) => {
                    const invoice = String(row["invoiceId"] ?? "");
                    const showInvoice = invoice && invoice !== "0";
                    return (
                      <TableRow key={String(row.id)}>
                        <TableCell className="font-medium">{String(row["offerTitle"] ?? row["offerId"] ?? "Offer")}</TableCell>
                        <TableCell>{customerName(allRows, String(row["customerId"] ?? ""))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{String(row["offerType"] ?? "—")}</TableCell>
                        <TableCell className="text-sm">{locName(String(row["locationId"] ?? ""))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{String(row["issuedAt"] || "—")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{String(row["redeemedAt"] || "—")}</TableCell>
                        <TableCell className="font-mono text-xs">{showInvoice ? invoice : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={String(row["status"]) === "Redeemed" ? "outline" : "secondary"}>
                            {String(row["status"] ?? "")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(issueOfferId)}
        onOpenChange={(open) => {
          if (!open) {
            setIssueOfferId(null);
            setIssueCustomerId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue offer</DialogTitle>
            <DialogDescription>
              Creates a claim for this customer. They apply it at POS; it then shows as Redeemed on the Claims tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Offer</Label>
              <Select value={issueOfferId ?? undefined} onValueChange={setIssueOfferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select offer" />
                </SelectTrigger>
                <SelectContent>
                  {offerRows
                    .filter((o) => String(o["status"] ?? "Active") === "Active")
                    .map((o) => (
                      <SelectItem key={String(o.id)} value={String(o.id)}>
                        {String(o["title"] ?? o.id)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Customer</Label>
              <Select value={issueCustomerId || undefined} onValueChange={setIssueCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter((c) => String(c["orgId"] ?? "") === String(org.orgId) || !c["orgId"])
                    .map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {String(c["name"])} · {String(c["phone"] ?? c.id)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOfferId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!issueOffer || !issueCustomerId) return void toast.error("Select offer and customer");
                const loc = locationId === "all" ? String(org.locations[0]?.locationId ?? "") : locationId;
                const result = issueOfferToCustomer(
                  { db: allRows, create, update: () => undefined },
                  {
                    offer: issueOffer,
                    customerId: issueCustomerId,
                    orgId: org.orgId,
                    locationId: loc,
                  },
                );
                if (!result.ok) return void toast.error(result.error);
                toast.success("Offer issued — see Claims");
                setIssueOfferId(null);
                setIssueCustomerId("");
                setTab("claims");
              }}
            >
              Issue claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
