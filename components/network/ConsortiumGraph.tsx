"use client";

import { useMemo, useState } from "react";

type NodeId = "mule" | "lenderA" | "lenderB" | "lenderC" | "hash";

const NODES: Record<
  NodeId,
  { x: number; y: number; label: string; sub: string }
> = {
  mule: { x: 280, y: 200, label: "Mule Wallet", sub: "024XXXX891" },
  lenderA: { x: 80, y: 70, label: "Lender A", sub: "ID-synth · 7f2a" },
  lenderB: { x: 480, y: 70, label: "Lender B", sub: "ID-synth · 91c4" },
  lenderC: { x: 280, y: 360, label: "Lender C", sub: "ID-synth · b03e" },
  hash: { x: 280, y: 200, label: "", sub: "" },
};

const ATTEMPTS = [
  {
    lender: "Lender A",
    t: "T+0m",
    id: "GHA-8841-SYN",
    outcome: "CHALLENGE",
  },
  {
    lender: "Lender B",
    t: "T+3m",
    id: "GHA-9912-SYN",
    outcome: "HALT",
  },
  {
    lender: "Lender C",
    t: "T+8m",
    id: "GHA-4401-SYN",
    outcome: "HALT",
  },
] as const;

export function ConsortiumGraph() {
  const [selected, setSelected] = useState(false);

  const edges = useMemo(
    () =>
      selected
        ? ([
            ["mule", "lenderA"],
            ["mule", "lenderB"],
            ["mule", "lenderC"],
          ] as const)
        : [],
    [selected],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="afie-card overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="font-mono text-[11px] text-[#8B95A8]">
            consortium · entity resolution graph
          </p>
          <button
            type="button"
            onClick={() => setSelected((v) => !v)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${
              selected
                ? "border-red-500/35 bg-red-500/10 text-red-400"
                : "border-white/[0.12] bg-[#111827] text-[#C5CCD6] hover:text-white"
            }`}
          >
            {selected ? "Clear selection" : "Select 024XXXX891"}
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-[#06080D] sm:aspect-[16/10]">
          <svg
            viewBox="0 0 560 420"
            className="h-full w-full"
            role="img"
            aria-label="Cross-tenant consortium graph"
          >
            {edges.map(([from, to]) => {
              const a = NODES[from];
              const b = NODES[to];
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(239,68,68,0.55)"
                  strokeWidth={1.5}
                />
              );
            })}

            {(
              [
                ["lenderA", false],
                ["lenderB", false],
                ["lenderC", false],
                ["mule", true],
              ] as const
            ).map(([id, isMule]) => {
              const n = NODES[id];
              return (
                <g
                  key={id}
                  className="cursor-pointer"
                  onClick={() => {
                    if (isMule) setSelected(true);
                  }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isMule ? 28 : 22}
                    fill={
                      selected && isMule
                        ? "rgba(239,68,68,0.15)"
                        : selected
                          ? "rgba(245,158,11,0.12)"
                          : "#0B0F17"
                    }
                    stroke={
                      selected && isMule
                        ? "rgba(239,68,68,0.55)"
                        : selected
                          ? "rgba(245,158,11,0.45)"
                          : "rgba(255,255,255,0.12)"
                    }
                    strokeWidth={1.5}
                  />
                  <text
                    x={n.x}
                    y={n.y - 4}
                    textAnchor="middle"
                    fill={selected && isMule ? "#FCA5A5" : "#C5CCD6"}
                    fontSize={11}
                    fontFamily="ui-monospace, monospace"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 12}
                    textAnchor="middle"
                    fill="#5C6678"
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                  >
                    {n.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="afie-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white">
            Attempt timeline · 8 minutes
          </h3>
          <ul className="mt-4 space-y-3">
            {ATTEMPTS.map((row) => (
              <li
                key={row.lender}
                className={`rounded-md border px-3 py-2.5 font-mono text-[11px] ${
                  selected
                    ? row.outcome === "HALT"
                      ? "border-red-500/20 bg-red-500/10 text-red-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-white/[0.06] text-[#5C6678]"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span>{row.t} · {row.lender}</span>
                  <span className="tabular-nums">{row.outcome}</span>
                </div>
                <p className="mt-1 opacity-80">national_id_hash · {row.id}</p>
              </li>
            ))}
          </ul>
          {!selected ? (
            <p className="mt-4 text-xs text-[#5C6678]">
              Select the mule wallet to illuminate cross-lender edges.
            </p>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-[#8B95A8]">
              One phone number, three synthetic national IDs, three lenders —
              resolved only via salted hashes. No raw PII crossed tenancy
              boundaries.
            </p>
          )}
        </div>

        <div className="afie-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white">Trust architecture</h3>
          <ol className="mt-4 space-y-3 text-sm text-[#8B95A8]">
            <li>
              <span className="font-mono text-[11px] text-[#5C6678]">1 · </span>
              Salt per consortium, never shared plaintext identifiers.
            </li>
            <li>
              <span className="font-mono text-[11px] text-[#5C6678]">2 · </span>
              SHA-256 digest of (salt ‖ normalized MSISDN / device / beneficiary).
            </li>
            <li>
              <span className="font-mono text-[11px] text-[#5C6678]">3 · </span>
              Match emits only risk signal + reason code — never name or balance.
            </li>
            <li>
              <span className="font-mono text-[11px] text-[#5C6678]">4 · </span>
              Competitors cannot reverse hashes or enumerate another tenant&apos;s book.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
