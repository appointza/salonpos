import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SAFETY_REPORT_REASONS } from "@/model/safety";
import { safetyService } from "@/services/safety.service";
import { apiErrorMessage } from "@/utils/api-error";

export function ReportSafetyForm({
  reporterId = 0,
  reporterContact = "",
  compact = false,
  onSubmitted,
}: {
  reporterId?: number;
  reporterContact?: string;
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [contact, setContact] = useState(reporterContact);
  const [busy, setBusy] = useState(false);
  const [reportId, setReportId] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Select a report reason");
      return;
    }
    setBusy(true);
    try {
      const res = await safetyService.submit({
        reporterId: Number(reporterId) || 0,
        reporterContact: contact.trim(),
        reportedUserId: 0,
        reportedContentId: "",
        reason,
        description: description.trim(),
        evidence: evidence.trim(),
      });
      setReportId(res.reportId);
      toast.success(res.message || "Report submitted");
      onSubmitted?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not submit this report"));
    } finally {
      setBusy(false);
    }
  }

  if (reportId > 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Report submitted</p>
        <p className="mt-1 text-muted-foreground">
          Reference <span className="font-mono">#{reportId}</span>. A reviewer will investigate. This is not a finding
          of confirmed abuse.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <Label htmlFor="safety-reason">Reason</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger id="safety-reason" className="mt-1">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {SAFETY_REPORT_REASONS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="safety-description">What happened</Label>
        <Textarea
          id="safety-description"
          className="mt-1"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the user or content. Do not upload illegal images."
        />
      </div>
      <div>
        <Label htmlFor="safety-evidence">Link or other detail (optional)</Label>
        <Input
          id="safety-evidence"
          className="mt-1"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Screen, URL, outlet name, or user name"
        />
      </div>
      <div>
        <Label htmlFor="safety-contact">Your email or phone (optional)</Label>
        <Input
          id="safety-contact"
          className="mt-1"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="So we can follow up"
        />
      </div>
      <Button type="submit" disabled={busy}>
        <Flag className="size-4" />
        {busy ? "Sending…" : "Submit report"}
      </Button>
    </form>
  );
}
