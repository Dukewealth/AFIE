"use client";

import { CreditCard, Landmark, Search, Smartphone } from "lucide-react";
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
    <section className="overflow-hidden rounded-md border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm print:hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-2.5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
            Event stream
          </p>
          <h2 className="text-sm font-medium text-slate-100">High-density evaluation tape</h2>
        </div>
        <p className="font-mono text-[10px] tracking-[0.12em] text-slate-500 uppercase">
          {transactions.length} events
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-slate-500">
          Waiting for ingestion events…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 font-mono text-[10px] tracking-[0.12em] text-slate-500 uppercase">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Transaction ID</th>
                <th className="px-3 py-2 font-medium">User ID</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Rail</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Latency</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const selected = transaction.id === selectedId;
                return (
                  <tr
                    key={transaction.id}
                    className={`border-b border-slate-800/60 transition-colors ${
                      selected ? "bg-emerald-950/30" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {formatClockTime(transaction.created_at)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-100">
                      {transaction.external_tx_id}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                      {transaction.user_id}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-100">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-3 py-2.5">
                      <RailBadge method={transaction.payment_method} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-300">
                      {transaction.risk_score}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                      {transaction.latency_ms ?? "—"}
                      {transaction.latency_ms !== null ? " ms" : ""}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect(transaction)}
                        className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-300 uppercase transition hover:border-emerald-800/60 hover:text-emerald-400"
                      >
                        <Search className="h-3 w-3" />
                        Investigate
                      </button>
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

function RailBadge({ method }: { method: string }) {
  const Icon =
    method === "momo" ? Smartphone : method === "bank_transfer" ? Landmark : CreditCard;

  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 uppercase">
      <Icon className="h-3 w-3 text-slate-500" />
      {formatRail(method)}
    </span>
  );
}
