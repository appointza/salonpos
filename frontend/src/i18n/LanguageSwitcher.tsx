import { Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LANGUAGE_OPTIONS, type AppLanguage } from "@/i18n/languages";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/utils/utils";

export function LanguageSwitcher({
  className,
  compact = false,
  notify = false,
}: {
  className?: string;
  compact?: boolean;
  notify?: boolean;
}) {
  const { language, setLanguage, t } = useLanguage();

  function apply(next: AppLanguage) {
    setLanguage(next);
    if (notify) {
      toast.success(t("Language saved"), {
        description: t("This account will use this language on every screen."),
      });
    }
  }

  if (compact) {
    return (
      <Select value={language} onValueChange={(v) => apply(v as AppLanguage)}>
        <SelectTrigger className={cn("h-9 w-[8.5rem] min-w-0", className)} aria-label={t("Language")}>
          <Languages className="size-4 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.native}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={className}>
      <Label className="mb-1.5">{t("Display language")}</Label>
      <Select value={language} onValueChange={(v) => apply(v as AppLanguage)}>
        <SelectTrigger className="w-full max-w-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.native} — {t(opt.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
