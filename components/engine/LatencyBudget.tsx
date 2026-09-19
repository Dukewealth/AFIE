"use client";

import { useMemo, useState } from "react";

const BUDGET = [
  { id: "ingress", label: "Ingress", ms: 8, color: "#2563EB" },
  { id: "cache", label: "Cache & Device", ms: 12, color: "#10B981" },
  { id: "graph", label: "Graph Check", ms: 10, color: "#F59E0B" },
  { id: "model", label: "Model Scoring", ms: 6, color: "#EF4444" },
] as const;

export function LatencyBudget() {
  const [active, setActive] = useState<string | null>("ingress");
  const total = useMemo(() => BUDGET.reduce((s, b) => s + b.ms, 0), []);
  const focus = BUDGET.find((b) => b.id === active) ?? BUDGET[0];

  return (
    <div className="afie-card rounded-lg p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Latency budget</h3>
          <p className="mt-1 text-sm text-[#8B95A8]">
            Click a stage. Bars are proportional to the hard 40ms ceiling.
          </p>
        </div>
        <p className="font-mono text-sm tabular-nums text-white">
          Total {total}ms
          <span className="ml-2 text-[#5C6678]">/ 40ms</span>
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {BUDGET.map((stage) => {
          const pct = (stage.ms / 40) * 100;
          const selected = active === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActive(stage.id)}
              className={`block w-full rounded-md border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${
                selected
                  ? "border-white/[0.12] bg-[#111827]"
                  : "border-white/[0.06] bg-transparent hover:border-white/[0.1]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm text-[#C5CCD6]">{stage.label}</span>
                <span className="font-mono text-xs tabular-nums text-white">
                  {stage.ms}ms
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-sm bg-white/[0.04]">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-md border border-white/[0.06] bg-[#06080D] p-4">
        <p className="font-mono text-[11px] text-[#5C6678]">stage detail</p>
        <p className="mt-2 text-sm text-white">{focus.label}</p>
        <p className="mt-1 text-sm text-[#8B95A8]">
          {focus.id === "ingress" &&
            "TLS terminate, schema validate, tenant resolve — hard cap 8ms."}
          {focus.id === "cache" &&
            "Redis velocity windows + device fingerprint bloom — 12ms budget."}
          {focus.id === "graph" &&
            "Consortium hash lookup across salted entity index — 10ms budget."}
          {focus.id === "model" &&
            "Lightweight scoring head; heavy forensics escalate async — 6ms."}
        </p>
      </div>
    </div>
  );
}
