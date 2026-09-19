import { isTransactionStatus } from "@/lib/dashboard/format";
import type { TransactionStatus } from "@/lib/dashboard/types";

/** Analyst-facing decision labels mapped from engine statuses. */
const DECISION_LABEL: Record<TransactionStatus, string> = {
  ALLOWED: "APPROVE",
  CHALLENGED: "CHALLENGE",
  BLOCKED: "HALT",
};

const DECISION_STYLES: Record<TransactionStatus, string> = {
  ALLOWED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CHALLENGED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  BLOCKED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function StatusBadge({
  status,
  decisionStyle = true,
}: {
  status: string;
  decisionStyle?: boolean;
}) {
  const resolved = isTransactionStatus(status) ? status : null;
  const label =
    decisionStyle && resolved ? DECISION_LABEL[resolved] : (resolved ?? status);

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
        resolved
          ? DECISION_STYLES[resolved]
          : "border-slate-700 bg-slate-900/60 text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}

export function decisionLabel(status: string): string {
  if (isTransactionStatus(status)) return DECISION_LABEL[status];
  return status;
}
