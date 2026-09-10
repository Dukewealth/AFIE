import type { Transaction } from "@/lib/db/database.types";
import type { DashboardTransaction } from "@/lib/dashboard/types";

export function normalizeTransaction(row: Transaction): DashboardTransaction {
  return {
    ...row,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
  };
}
