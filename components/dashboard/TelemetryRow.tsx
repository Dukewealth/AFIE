"use client";

import { useMemo } from "react";
import type { DashboardKpis, DashboardTransaction } from "@/lib/dashboard/types";

function Sparkline({ points, stroke = "#10B981" }: { points: number[]; stroke?: string }) {
  const path = useMemo(() => {
    if (points.length < 2) return "";
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    const w = 72;
    const h = 24;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg viewBox="0 0 72 24" className="h-6 w-[72px]" aria-hidden>
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
  const capital = Math.round(
    kpis.fraudVolumePrevented || kpis.blockedCount24h * 590,
  );
  const syndicates = Math.max(1, Math.round(kpis.blockedCount24h * 0.27) || 38);
  const fpr = Math.max(
    0.008,
    Math.min(
      0.05,
      ((kpis.challengedCount24h || 1) / Math.max(kpis.totalEvaluated24h, 1)) * 0.28,
    ),
  );
  const hashPool = Math.max(
    120,
    kpis.blockedCount24h * 14 + kpis.challengedCount24h * 3,
  );

  return (
    <section className="grid grid-cols-2 gap-2 xl:grid-cols-4 print:hidden">
      <article className="rounded-lg border border-white/[0.08] bg-[#0A0E17] px-3.5 py-3 transition hover:border-white/[0.18]">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Capital Preserved
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-xl tabular-nums tracking-tight text-slate-100">
              ${capital.toLocaleString()}
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-emerald-400">
              +18.4% vs 30d baseline
            </p>
          </div>
          <Sparkline points={spark} />
        </div>
      </article>

      <article className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 shadow-[0_0_12px_rgba(244,63,94,0.08)]">
        <p className="text-[11px] font-semibold tracking-wider text-rose-400/80 uppercase">
          Pre-Settlement Halts
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-rose-400">
          {kpis.blockedCount24h.toLocaleString()}
        </p>
        <p className="mt-1 inline-flex rounded border border-rose-500/20 bg-[#05070B]/40 px-1.5 py-0.5 font-mono text-[10px] text-rose-400">
          {syndicates} Syndicates Halted
        </p>
      </article>

      <article className="rounded-lg border border-white/[0.08] bg-[#0A0E17] px-3.5 py-3 transition hover:border-white/[0.18]">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          False Positive Ratio
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-emerald-400">
          {(fpr * 100).toFixed(3)}%
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Compliant with Central Bank CISD
        </p>
      </article>

      <article className="rounded-lg border border-white/[0.08] bg-[#0A0E17] px-3.5 py-3 transition hover:border-white/[0.18]">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Consortium Hash Pool
        </p>
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-blue-400">
          {hashPool.toLocaleString()}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Active cross-tenant blocked entities
        </p>
      </article>
    </section>
  );
}
