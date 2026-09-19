"use client";

import { formatAbsoluteTime, formatAmount, formatPercent } from "@/lib/dashboard/format";
import type { DashboardKpis, DashboardTransaction } from "@/lib/dashboard/types";

export function DailyReportPrint({
  kpis,
  transactions,
}: {
  kpis: DashboardKpis;
  transactions: DashboardTransaction[];
}) {
  const flagged = transactions.filter(
    (tx) => tx.status === "BLOCKED" || tx.status === "CHALLENGED",
  );
  const generatedAt = formatAbsoluteTime(new Date().toISOString());

  return (
    <div id="afie-daily-report" className="afie-print-report hidden">
      <header className="mb-6 border-b border-zinc-300 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">
          AFIE Institutional Risk Summary
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generated {generatedAt} · Status: Autonomous Active
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total evaluated" value={kpis.totalEvaluated24h.toLocaleString()} />
        <Metric label="Autonomous block rate" value={formatPercent(kpis.blockRate)} />
        <Metric
          label="Fraud volume prevented"
          value={formatAmount(kpis.fraudVolumePrevented, "USD")}
        />
        <Metric label="Average latency" value={`${kpis.averageLatencyMs} ms`} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-800 uppercase">
          Flagged & blocked audit log
        </h2>
        {flagged.length === 0 ? (
          <p className="text-sm text-zinc-600">No challenged or blocked cases in the current window.</p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-300 text-zinc-600">
                <th className="py-2 pr-2 font-medium">Time</th>
                <th className="py-2 pr-2 font-medium">TX ID</th>
                <th className="py-2 pr-2 font-medium">User</th>
                <th className="py-2 pr-2 font-medium">Amount</th>
                <th className="py-2 pr-2 font-medium">Status</th>
                <th className="py-2 pr-2 font-medium">Score</th>
                <th className="py-2 font-medium">AI / decision reason</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-200 align-top">
                  <td className="py-2 pr-2 whitespace-nowrap">{formatAbsoluteTime(tx.created_at)}</td>
                  <td className="py-2 pr-2 font-mono">{tx.external_tx_id}</td>
                  <td className="py-2 pr-2 font-mono">{tx.user_id}</td>
                  <td className="py-2 pr-2">{formatAmount(tx.amount, tx.currency)}</td>
                  <td className="py-2 pr-2">{tx.status}</td>
                  <td className="py-2 pr-2">{tx.risk_score}</td>
                  <td className="py-2 max-w-xs">{tx.decision_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-300 p-3">
      <p className="text-[10px] tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg text-zinc-900">{value}</p>
    </div>
  );
}
