import { Link } from "@tanstack/react-router";

export function StockFlowNote() {
  return (
    <p className="text-sm text-muted-foreground">
      Buy product on{" "}
      <Link to="/expenses" className="text-primary underline-offset-2 hover:underline">
        Expenses
      </Link>{" "}
      (Purchase) → remaining stock on{" "}
      <Link to="/inventory" className="text-primary underline-offset-2 hover:underline">
        Inventory
      </Link>{" "}
      → use or sell for a customer on{" "}
      <Link to="/pos" className="text-primary underline-offset-2 hover:underline">
        POS
      </Link>
      . Adjustments, wastage and returns are posted on Inventory. The customer record shows what was used for them.
    </p>
  );
}
