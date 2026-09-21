"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DashboardTransaction } from "@/lib/dashboard/types";

const PHASES = [
  { id: "ingress", label: "Ingress", ms: 5, color: "#3B82F6" },
  { id: "cache", label: "Cache", ms: 8, color: "#10B981" },
  { id: "graph", label: "Consortium Graph", ms: 12, color: "#F59E0B" },
  { id: "ml", label: "ML Classifier", ms: 6, color: "#F43F5E" },
] as const;

const VECTORS = [
  { id: "ghost", label: "Ghost loans", key: "insider" },
  { id: "sim", label: "SIM swap drain", key: "sim" },
  { id: "stack", label: "Loan stacking", key: "stack" },
  { id: "card", label: "Card testing", key: "card" },
] as const;

function classify(tx: DashboardTransaction): string {
  const reason = (tx.decision_reason ?? "").toLowerCase();
  if (tx.payment_method === "card" || reason.includes("card")) return "card";
  if (reason.includes("sim") || reason.includes("swap")) return "sim";
  if (reason.includes("stack") || reason.includes("velocity")) return "stack";
  if (reason.includes("insider") || reason.includes("ghost") || tx.status === "BLOCKED")
    return "ghost";
  if (tx.status === "CHALLENGED") return "sim";
  return "stack";
}

export function AttackVectorTray({
  transactions,
}: {
  transactions: DashboardTransaction[];
}) {
  const [open, setOpen] = useState(true);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {
      ghost: 0,
      sim: 0,
      stack: 0,
      card: 0,
    };
    for (const tx of transactions) {
      if (tx.status === "ALLOWED") continue;
      counts[classify(tx)] = (counts[classify(tx)] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return VECTORS.map((v) => ({
      ...v,
      count: counts[v.key] ?? 0,
      pct: ((counts[v.key] ?? 0) / total) * 100,
    }));
  }, [transactions]);

  const budgetTotal = PHASES.reduce((s, p) => s + p.ms, 0);

  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#0A0E17] print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Attack Vector Distribution & Latency Budget
          </p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
            Evaluation path {budgetTotal}ms · budget &lt;40ms
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="grid gap-4 border-t border-white/[0.08] px-3 py-3 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Fraud attempt categories
            </p>
            <div className="space-y-2">
              {distribution.map((v) => (
                <div key={v.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-300">{v.label}</span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">
                      {v.count} · {v.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.04]">
                    <div
                      className="h-full rounded-sm bg-blue-500/80 transition-all duration-300"
                      style={{ width: `${Math.max(v.pct, v.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Latency budget tracker
            </p>
            <div className="flex h-3 overflow-hidden rounded-sm border border-white/[0.08]">
              {PHASES.map((p) => (
                <div
                  key={p.id}
                  title={`${p.label}: ${p.ms}ms`}
                  style={{
                    width: `${(p.ms / budgetTotal) * 100}%`,
                    backgroundColor: p.color,
                  }}
                  className="h-full"
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {PHASES.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-white/[0.08] bg-[#05070B] px-2 py-1.5"
                >
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.label}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-200">
                    {p.ms}ms
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
