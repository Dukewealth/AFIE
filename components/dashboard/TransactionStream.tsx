"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Landmark,
  Network,
  Pause,
  Play,
  Smartphone,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  formatAmount,
  formatClockTime,
  formatRail,
} from "@/lib/dashboard/format";
import type { DashboardTransaction } from "@/lib/dashboard/types";

type RailFilter = "all" | "momo" | "card" | "bank_transfer";

const FILTERS: { id: RailFilter; label: string }[] = [
  { id: "all", label: "All Rails" },
  { id: "momo", label: "MoMo" },
  { id: "card", label: "Cards" },
  { id: "bank_transfer", label: "Core Banking Wires" },
];

function riskTone(score: number) {
  if (score >= 70)
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (score >= 40)
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
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
    return first ? `${first.slice(0, 44)}…` : "—";
  }
  if (tx.status === "BLOCKED") return "AUTO_HALT_THRESHOLD";
  if (tx.status === "CHALLENGED") return "STEP_UP_REVIEW";
  return "CLEAR";
}

export function TransactionStream({
  transactions,
  selectedId,
  paused,
  onTogglePause,
  onSelect,
  onRelease,
  onConfirmFraud,
  onInspectGraph,
}: {
  transactions: DashboardTransaction[];
  selectedId: string | null;
  paused: boolean;
  onTogglePause: () => void;
  onSelect: (transaction: DashboardTransaction) => void;
  onRelease: (transaction: DashboardTransaction) => void;
  onConfirmFraud: (transaction: DashboardTransaction) => void;
  onInspectGraph: (transaction: DashboardTransaction) => void;
}) {
  const [rail, setRail] = useState<RailFilter>("all");

  const rows = useMemo(() => {
    if (rail === "all") return transactions;
    return transactions.filter((tx) => tx.payment_method === rail);
  }, [transactions, rail]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0A0E17] print:hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Real-Time Ingress Matrix
          </p>
          <p className="font-mono text-[11px] tabular-nums text-slate-500">
            {rows.length} events
            {paused ? " · paused" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRail(f.id)}
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide uppercase transition active:scale-[0.98] ${
                rail === f.id
                  ? "border-blue-500/30 bg-[#151E32] text-blue-400"
                  : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.18] hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] font-semibold tracking-wider text-slate-300 uppercase transition hover:border-white/[0.18] hover:bg-white/[0.08] active:scale-[0.98]"
            aria-pressed={paused}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-slate-500">
          No ingress for this rail filter…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#0A0E17]">
              <tr className="border-b border-white/[0.08] text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-2.5 py-2 font-semibold">Time</th>
                <th className="px-2.5 py-2 font-semibold">Txn ID</th>
                <th className="px-2.5 py-2 font-semibold">Channel</th>
                <th className="px-2.5 py-2 font-semibold">Amount</th>
                <th className="px-2.5 py-2 font-semibold">Risk</th>
                <th className="px-2.5 py-2 font-semibold">Decision</th>
                <th className="px-2.5 py-2 font-semibold">Primary Trigger</th>
                <th className="px-2.5 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx, index) => {
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
                    className={`group cursor-pointer border-b border-white/[0.04] transition-colors ${
                      selected
                        ? "bg-blue-500/[0.06] shadow-[inset_3px_0_0_#3B82F6]"
                        : index % 2 === 1
                          ? "bg-white/[0.015] hover:bg-white/[0.02]"
                          : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-2.5 py-2 font-mono text-[11px] tabular-nums whitespace-nowrap text-slate-400">
                      {formatClockTime(tx.created_at)}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] tabular-nums text-slate-200">
                      {tx.external_tx_id}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 uppercase">
                        <Icon className="h-3 w-3" />
                        {formatRail(tx.payment_method)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] tabular-nums text-slate-100">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        className={`inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${riskTone(tx.risk_score)}`}
                      >
                        {score01.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="max-w-[180px] truncate px-2.5 py-2 font-mono text-[10px] text-slate-500">
                      {primaryTrigger(tx)}
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          title="Release Hold"
                          aria-label="Release Hold"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRelease(tx);
                          }}
                          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 transition hover:bg-emerald-500/20 active:scale-[0.98]"
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
                          className="rounded-md border border-rose-500/20 bg-rose-500/10 p-1 text-rose-400 transition hover:bg-rose-500/20 active:scale-[0.98]"
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
                          className="rounded-md border border-white/[0.08] bg-white/[0.03] p-1 text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 active:scale-[0.98]"
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
