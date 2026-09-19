import { isTransactionStatus } from "@/lib/dashboard/format";
import type { TransactionStatus } from "@/lib/dashboard/types";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  ALLOWED:
    "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50",
  CHALLENGED:
    "bg-amber-950/60 text-amber-400 border border-amber-800/50",
  BLOCKED:
    "bg-rose-950/60 text-rose-400 border border-rose-800/50",
};

export function StatusBadge({ status }: { status: string }) {
  const resolved = isTransactionStatus(status) ? status : null;

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase ${
        resolved
          ? STATUS_STYLES[resolved]
          : "border border-slate-700 bg-slate-900/60 text-slate-400"
      }`}
    >
      {resolved ?? status}
    </span>
  );
}
