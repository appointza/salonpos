import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { useT } from "@/i18n/LanguageContext";

export type ListView = "table" | "card";

const KEY = "salon-crm-list-view";
/** Phone and tablet: always cards. Desktop (lg / 1024px+) uses the saved table/card toggle. */
const COMPACT_MQ = "(max-width: 1023px)";

type Ctx = { view: ListView; setView: (v: ListView) => void; compact: boolean };

const ListViewContext = createContext<Ctx | null>(null);

function readCompact() {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_MQ).matches;
}

export function ListViewProvider({ children }: { children: ReactNode }) {
  const [compact, setCompact] = useState(readCompact);
  const [preference, setPreference] = useState<ListView | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "table" || saved === "card") setPreference(saved);
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia(COMPACT_MQ);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setView = useCallback((next: ListView) => {
    setPreference(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const view: ListView = compact ? "card" : (preference ?? "table");
  const value = useMemo(() => ({ view, setView, compact }), [view, setView, compact]);
  return <ListViewContext.Provider value={value}>{children}</ListViewContext.Provider>;
}

export function useListView() {
  const ctx = useContext(ListViewContext);
  if (!ctx) throw new Error("useListView must be used inside ListViewProvider");
  return ctx;
}

export function ViewToggle({ className }: { className?: string }) {
  const { view, setView, compact } = useListView();
  const t = useT();
  if (compact) return null;
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-card p-0.5", className)} role="group" aria-label={t("Table or card view")}>
      <Button
        type="button"
        size="icon"
        variant={view === "table" ? "secondary" : "ghost"}
        className="size-8"
        aria-pressed={view === "table"}
        aria-label={t("Table view")}
        onClick={() => setView("table")}
      >
        <Table2 className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={view === "card" ? "secondary" : "ghost"}
        className="size-8"
        aria-pressed={view === "card"}
        aria-label={t("Card view")}
        onClick={() => setView("card")}
      >
        <LayoutGrid className="size-4" />
      </Button>
    </div>
  );
}
