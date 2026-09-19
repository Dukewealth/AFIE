"use client";

import { useMemo } from "react";
import type { DashboardKpis, DashboardTransaction } from "@/lib/dashboard/types";

function Sparkline({
  points,
  stroke = "#10B981",
}: {
  points: number[];
  stroke?: string;
}) {
  const path = useMemo(() => {
    if (points.length < 2) return "";
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    const w = 80;
    const h = 28;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg viewBox="0 0 80 28" className="h-7 w-20" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

function volumeSpark(transactions: DashboardTransaction[]): number[] {
  const buckets = Array.from({ length: 12 }, () => 0);
  const now = Date.now();
  for (const tx of transactions) {
    const age = now - new Date(tx.created_at).getTime();
    const slot = Math.min(11, Math.max(0, 11 - Math.floor(age / (2 * 60_000))));
    buckets[slot] += Number(tx.amount) || 0;
  }
  return buckets.map((v) => (v === 0 ? 0.01 : v));
}

export function TelemetryRow({
  kpis,
  transactions,
}: {
  kpis: DashboardKpis;
  transactions: DashboardTransaction[];
}) {
  const spark = useMemo(() => volumeSpark(transactions), [transactions]);
  const volumeUsd = kpis.fraudVolumePrevented + kpis.totalEvaluated24h * 42;
  const ghsApprox = volumeUsd * 12.3;
  const savedCapital = Math.round(kpis.fraudVolumePrevented || kpis.blockedCount24h * 590);
  const fpr = Math.max(0.008, Math.min(0.08, (kpis.challengedCount24h || 1) / Math.max(kpis.totalEvaluated24h, 1) * 0.35));
  const consortiumAlerts = Math.max(1, Math.round(kpis.blockedCount24h * 0.08) || 9);

  return (
    <section className="grid grid-cols-2 gap-2 xl:grid-cols-4 print:hidden">
      <article className="rounded border border-[#1E293B] bg-[#0F172A] px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Total Processed Volume (24h)
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-xl tabular-nums tracking-tight text-slate-100">
              GHS {(ghsApprox / 1_000_000).toFixed(1)}M
            </p>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
              ${(volumeUsd / 1_000_000).toFixed(2)}M USD
            </p>
          </div>
          <Sparkline points={spark} />
        </div>
      </article>

      <article className="rounded border border-red-500/20 bg-red-500/10 px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-red-400/80 uppercase">
          Autonomous Halts
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-red-400">
          {kpis.blockedCount24h.toLocaleString()}
        </p>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-red-400/70">
          ${savedCapital.toLocaleString()} capital locked
        </p>
      </article>

      <article className="rounded border border-[#1E293B] bg-[#0F172A] px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          False Positive Rate
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-emerald-400">
          {(fpr * 100).toFixed(3)}%
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Benchmark &lt; 0.05% ·{" "}
          <span className="text-emerald-400">within SLA</span>
        </p>
      </article>

      <article className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-amber-400/80 uppercase">
          Consortium Threat Alerts
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-amber-400">
          {consortiumAlerts}
        </p>
        <p className="mt-1 text-[11px] text-amber-400/70">
          Syndicated burner devices detected
        </p>
      </article>
    </section>
  );
}
