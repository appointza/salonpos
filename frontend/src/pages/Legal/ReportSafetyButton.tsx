import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReportSafetyForm } from "@/pages/Legal/ReportSafetyForm";

export function ReportSafetyButton({
  reporterId = 0,
  reporterContact = "",
  compact = false,
}: {
  reporterId?: number;
  reporterContact?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          size={compact ? "sm" : "default"}
          className={compact ? "w-full text-muted-foreground hover:text-foreground" : undefined}
        >
          <Flag className="size-4" />
          Report user or content
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report a safety concern</AlertDialogTitle>
          <AlertDialogDescription>
            Use this for child safety, exploitation, grooming, or other prohibited content. Reports go to Kriosapp
            safety staff for review. Do not attach illegal images.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ReportSafetyForm compact reporterId={reporterId} reporterContact={reporterContact} />
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
