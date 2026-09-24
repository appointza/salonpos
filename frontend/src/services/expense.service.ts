/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ExpenseRes } from "@/model/expenses";

export class ExpenseService extends KriosBaseService<ExpenseRes> {
  constructor() {
    super("Expense");
  }
}

export const expenseService = new ExpenseService();
