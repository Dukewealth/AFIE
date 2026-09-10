"use client";

import { Radio } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  formatAmount,
  formatClockTime,
  formatRail,
} from "@/lib/dashboard/format";
import type { DashboardTransaction } from "@/lib/dashboard/types";

export function TransactionStream({
  transactions,
  selectedId,
  onSelect,
}: {
  transactions: DashboardTransaction[];
  selectedId: string | null;
  onSelect: (transaction: DashboardTransaction) => void;
}) {
  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--dash-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="dashboard-kicker">Live evaluation tape</p>
          <h2 className="mt-1 text-sm font-medium text-[var(--dash-paper)]">
            Incoming verdicts
          </h2>
        </div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-slate-500 uppercase">
          {transactions.length} in view
        </p>
      </div>

      {transactions.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--dash-line)] text-[10px] tracking-[0.16em] text-slate-500 uppercase">
                <th className="px-4 py-2.5 font-medium sm:px-5">Time</th>
                <th className="px-3 py-2.5 font-medium">External TX ID</th>
                <th className="px-3 py-2.5 font-medium">User ID</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Payment rail</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Risk</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Latency</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => {
                const selected = transaction.id === selectedId;
                return (
                  <tr
                    key={transaction.id}
                    tabIndex={0}
                    aria-selected={selected}
                    onClick={() => onSelect(transaction)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(transaction);
                      }
                    }}
                    className={`group cursor-pointer border-b border-[var(--dash-line)]/80 outline-none transition-colors ${
                      index === 0 ? "row-arrive" : ""
                    } ${
                      selected
                        ? "bg-[var(--dash-signal)]/8"
                        : "hover:bg-white/[0.03] focus-visible:bg-white/[0.04]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300 sm:px-5">
                      {formatClockTime(transaction.created_at)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--dash-paper)]">
                      {transaction.external_tx_id}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {transaction.user_id}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--dash-paper)]">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-300">
                      {formatRail(transaction.payment_method)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-3 py-3">
                      <RiskMeter score={transaction.risk_score} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 sm:px-5">
                      {transaction.latency_ms ?? "—"}
                      {transaction.latency_ms !== null ? (
                        <span className="ml-1 text-slate-600">ms</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RiskMeter({ score }: { score: number }) {
  const tone =
    score >= 70 ? "bg-rose-400" : score >= 30 ? "bg-amber-300" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 font-mono text-xs text-slate-200">{score}</span>
      <span className="h-1 w-16 overflow-hidden rounded-sm bg-white/10">
        <span className={`block h-full ${tone}`} style={{ width: `${score}%` }} />
      </span>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Radio className="h-5 w-5 text-[var(--dash-signal)]" strokeWidth={1.5} />
      <p className="mt-3 text-sm text-slate-300">No evaluations on the tape yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        Submit a transaction to{" "}
        <code className="rounded-sm bg-white/5 px-1.5 py-0.5 font-mono text-[var(--dash-signal)]">
          POST /api/v1/evaluate
        </code>{" "}
        and it will land here as soon as it is persisted.
      </p>
    </div>
  );
}
