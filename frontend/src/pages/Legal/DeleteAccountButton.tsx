import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/utils/api-error";

export function DeleteAccountButton({
  userId,
  phone,
  onDeleted,
  compact = false,
}: {
  userId?: number;
  phone?: string;
  onDeleted: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = typed.trim().toUpperCase() === "DELETE";

  async function confirm() {
    if (!ready) return;
    setBusy(true);
    try {
      await authService.deleteAccount({
        userId: Number(userId) || 0,
        phone: phone ?? "",
        confirmation: "DELETE",
      });
      setOpen(false);
      toast.success("Account deleted");
      onDeleted();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete this account"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "destructive"}
          size={compact ? "sm" : "default"}
          className={compact ? "w-full text-destructive hover:text-destructive" : undefined}
        >
          <Trash2 /> Delete my account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this account?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out and will not be able to sign in again. Salon invoice history may be kept as a
            business record with your name and phone removed. Type DELETE to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="delete-confirm" className="mb-1.5">
            Confirmation
          </Label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={!ready || busy} onClick={() => void confirm()}>
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
