"use client";

import { Ban, CheckCircle2, Network, Smartphone, CreditCard, Landmark } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  formatAmount,
  formatClockTime,
  formatRail,
} from "@/lib/dashboard/format";
import type { DashboardTransaction } from "@/lib/dashboard/types";

function riskTone(score: number) {
  if (score >= 70) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (score >= 40) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
}

function channelIcon(method: string) {
  if (method === "momo") return Smartphone;
  if (method === "bank_transfer") return Landmark;
  return CreditCard;
}

function primaryTrigger(tx: DashboardTransaction): string {
  if (tx.decision_reason) {
    const first = tx.decision_reason.split(/[.;\n]/)[0]?.trim();
    if (first && first.length < 48) return first;
    return first?.slice(0, 44) + "…" || "—";
  }
  if (tx.status === "BLOCKED") return "AUTO_HALT_THRESHOLD";
  if (tx.status === "CHALLENGED") return "STEP_UP_REVIEW";
  return "CLEAR";
}

export function TransactionStream({
  transactions,
  selectedId,
  onSelect,
  onRelease,
  onConfirmFraud,
  onInspectGraph,
}: {
  transactions: DashboardTransaction[];
  selectedId: string | null;
  onSelect: (transaction: DashboardTransaction) => void;
  onRelease: (transaction: DashboardTransaction) => void;
  onConfirmFraud: (transaction: DashboardTransaction) => void;
  onInspectGraph: (transaction: DashboardTransaction) => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-[#1E293B] bg-[#0F172A] print:hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[#1E293B] px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Real-Time Transaction Stream
          </p>
          <p className="font-mono text-[11px] tabular-nums text-slate-500">
            {transactions.length} events in buffer
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          LIVE
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-slate-500">
          Waiting for ingress…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#0F172A]">
              <tr className="border-b border-[#1E293B] text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-2 py-2 font-semibold">Timestamp</th>
                <th className="px-2 py-2 font-semibold">Txn ID</th>
                <th className="px-2 py-2 font-semibold">Channel</th>
                <th className="px-2 py-2 font-semibold">Amount</th>
                <th className="px-2 py-2 font-semibold">Risk</th>
                <th className="px-2 py-2 font-semibold">Decision</th>
                <th className="px-2 py-2 font-semibold">Primary Trigger</th>
                <th className="px-2 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const selected = tx.id === selectedId;
                const Icon = channelIcon(tx.payment_method);
                const score01 = Math.min(1, Math.max(0, tx.risk_score / 100));
                return (
                  <tr
                    key={tx.id}
                    tabIndex={0}
                    onClick={() => onSelect(tx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(tx);
                      }
                    }}
                    className={`group cursor-pointer border-b border-[#1E293B]/80 transition-colors ${
                      selected
                        ? "bg-emerald-500/5"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-2 py-2 font-mono text-[11px] tabular-nums whitespace-nowrap text-slate-400">
                      {formatClockTime(tx.created_at)}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-slate-200">
                      {tx.external_tx_id}
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 uppercase">
                        <Icon className="h-3 w-3" />
                        {formatRail(tx.payment_method)}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] tabular-nums text-slate-100">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${riskTone(tx.risk_score)}`}
                      >
                        {score01.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="max-w-[180px] truncate px-2 py-2 font-mono text-[10px] text-slate-500">
                      {primaryTrigger(tx)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          title="Release Hold"
                          aria-label="Release Hold"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRelease(tx);
                          }}
                          className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Confirm Fraud"
                          aria-label="Confirm Fraud"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfirmFraud(tx);
                          }}
                          className="rounded border border-red-500/20 bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20"
                        >
                          <Ban className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Inspect Entity Graph"
                          aria-label="Inspect Entity Graph"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectGraph(tx);
                          }}
                          className="rounded border border-[#1E293B] bg-[#090D16] p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Network className="h-3 w-3" />
                        </button>
                      </div>
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
