import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ListView = "table" | "card";

const KEY = "salon-crm-list-view";

type Ctx = { view: ListView; setView: (v: ListView) => void };

const ListViewContext = createContext<Ctx | null>(null);

export function ListViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ListView>("table");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "table" || saved === "card") setViewState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setView = useCallback((next: ListView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ view, setView }), [view, setView]);
  return <ListViewContext.Provider value={value}>{children}</ListViewContext.Provider>;
}

export function useListView() {
  const ctx = useContext(ListViewContext);
  if (!ctx) throw new Error("useListView must be used inside ListViewProvider");
  return ctx;
}

export function ViewToggle({ className }: { className?: string }) {
  const { view, setView } = useListView();
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-card p-0.5", className)} role="group" aria-label="Table or card view">
      <Button
        type="button"
        size="icon"
        variant={view === "table" ? "secondary" : "ghost"}
        className="size-8"
        aria-pressed={view === "table"}
        aria-label="Table view"
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
        aria-label="Card view"
        onClick={() => setView("card")}
      >
        <LayoutGrid className="size-4" />
      </Button>
    </div>
  );
}
