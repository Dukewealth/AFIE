import { isTransactionStatus } from "@/lib/dashboard/format";
import type { TransactionStatus } from "@/lib/dashboard/types";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  ALLOWED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  CHALLENGED: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  BLOCKED: "border-rose-500/35 bg-rose-500/10 text-rose-300",
};

export function StatusBadge({ status }: { status: string }) {
  const resolved = isTransactionStatus(status) ? status : null;

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase ${
        resolved ? STATUS_STYLES[resolved] : "border-white/10 bg-white/5 text-slate-400"
      }`}
    >
      {resolved ?? status}
    </span>
  );
}
