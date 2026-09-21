import { isTransactionStatus } from "@/lib/dashboard/format";
import type { TransactionStatus } from "@/lib/dashboard/types";

const DECISION_LABEL: Record<TransactionStatus, string> = {
  ALLOWED: "APPROVE",
  CHALLENGED: "CHALLENGE",
  BLOCKED: "HALT",
};

const DECISION_STYLES: Record<TransactionStatus, string> = {
  ALLOWED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CHALLENGED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  BLOCKED:
    "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
        resolved
          ? DECISION_STYLES[resolved]
          : "border-white/[0.08] bg-white/[0.03] text-slate-400"
      }`}
    >
      {resolved === "BLOCKED" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
      ) : resolved === "CHALLENGED" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      ) : resolved === "ALLOWED" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      ) : null}
      {label}
    </span>
  );
}

export function decisionLabel(status: string): string {
  if (isTransactionStatus(status)) return DECISION_LABEL[status];
  return status;
}
