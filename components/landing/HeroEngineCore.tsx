"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import Link from "next/link";
import { BinaryCodeStream } from "@/components/BinaryCodeStream";

type Stage = {
  id: string;
  label: string;
  latency: string;
  status: "pass" | "flag" | "match" | "halt";
  detail: string;
};

const STAGES: Stage[] = [
  {
    id: "l1",
    label: "L1: In-Memory Velocity (Redis)",
    latency: "4.2ms",
    status: "pass",
    detail: "PASS",
  },
  {
    id: "l2",
    label: "L2: SIM-Swap & Device Fingerprint",
    latency: "12.1ms",
    status: "flag",
    detail: "FLAG: Reused 4x across 2 lenders",
  },
  {
    id: "l3",
    label: "L3: Cross-Tenant Consortium Graph",
    latency: "14.3ms",
    status: "match",
    detail: "MATCH: High-Risk Mule Syndicate",
  },
  {
    id: "final",
    label: "Final Verdict",
    latency: "32.6ms",
    status: "halt",
    detail: "HALT",
  },
];

const PACKET = {
  ts: "2026-09-19T16:38:02.441Z",
  channel: "MTN MoMo",
  account: "mfi_acc_88421",
  beneficiary: "sha256:7f3a…e91c",
  velocity: "5 tx / 8m",
  amount: "GHS 2,500.00",
};

const STATUS_CLASS = {
  pass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  flag: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  match: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  halt: "border-red-500/20 bg-red-500/10 text-red-400",
} as const;

const CLI = `curl -X POST https://api.afie.io/v1/evaluate -d '{"amount": 2500}'`;

export function HeroEngineCore() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setStep((s) => (s >= STAGES.length ? 0 : s + 1));
    }, 900);
    return () => clearInterval(id);
  }, [running]);

  const copyCli = async () => {
    try {
      await navigator.clipboard.writeText(CLI);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-white/[0.06]"
    >
      <BinaryCodeStream />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-[11px] tracking-wide text-[#8B95A8]">
          <span className="text-emerald-400">INLINE PRE-AUTHORIZATION RISK INFERENCE</span>
          <span className="mx-2 text-[#3A4254]">·</span>
          GHIPSS / NIBSS / MOMO READY
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.15rem] lg:leading-[1.1]">
          Autonomous Fraud Halting at the Speed of Settlement.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#8B95A8] sm:text-lg">
          AFIE stops syndicates, insider ghost loans, and mobile money cash-out
          drains before funds leave your core banking ledger. Sub-40ms
          deterministic execution with privacy-preserving cross-institution
          entity graphs.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRunning(true);
              setStep(0);
            }}
            className="rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#06080D] transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            Test Live Transaction Ingress
          </button>
          <Link
            href="/integrations#playground"
            className="rounded-md border border-white/[0.12] bg-[#0B0F17] px-4 py-2.5 text-sm text-[#C5CCD6] transition hover:border-white/[0.18] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            View Integration Spec (REST / gRPC)
          </Link>
          <button
            type="button"
            onClick={() => void copyCli()}
            className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-md border border-white/[0.06] bg-[#111827] px-3 py-2 font-mono text-[11px] text-[#8B95A8] transition hover:border-white/[0.12] hover:text-[#C5CCD6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
            aria-label="Copy evaluate curl"
          >
            <span className="truncate">{CLI}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Dual-pane engine visual */}
        <div className="mt-12 grid gap-3 lg:grid-cols-2">
          <div className="afie-card overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-[11px] text-[#8B95A8]">
                ingress · raw packet
              </span>
              <span className="font-mono text-[10px] tabular-nums text-emerald-400">
                LIVE
              </span>
            </div>
            <dl className="grid gap-0 divide-y divide-white/[0.04] font-mono text-[12px]">
              {(
                [
                  ["timestamp", PACKET.ts],
                  ["channel", PACKET.channel],
                  ["account_id", PACKET.account],
                  ["beneficiary_hash", PACKET.beneficiary],
                  ["velocity", PACKET.velocity],
                  ["amount", PACKET.amount],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[#5C6678]">{k}</dt>
                  <dd className="tabular-nums text-[#C5CCD6]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className={`overflow-hidden rounded-lg border bg-[#0B0F17] ${
              step >= STAGES.length
                ? "border-red-500/35"
                : "border-white/[0.06]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-[11px] text-[#8B95A8]">
                decision pipeline · μs path
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[#5C6678]">
                budget &lt;40ms
              </span>
            </div>
            <div className="space-y-2 p-3">
              {STAGES.map((stage, index) => {
                const visible = step > index;
                return (
                  <div
                    key={stage.id}
                    className={`rounded-md border px-3 py-2.5 transition-opacity duration-200 ${
                      visible
                        ? STATUS_CLASS[stage.status]
                        : "border-white/[0.04] bg-transparent text-[#3A4254] opacity-40"
                    }`}
                    style={{ minHeight: 52 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px]">{stage.label}</p>
                        {visible ? (
                          <p className="mt-1 font-mono text-[10px] opacity-90">
                            {stage.detail}
                          </p>
                        ) : (
                          <p className="mt-1 font-mono text-[10px]">awaiting…</p>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        {visible ? stage.latency : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {step >= STAGES.length ? (
              <div className="border-t border-red-500/35 bg-red-500/10 px-4 py-3">
                <p className="font-mono text-xs font-semibold tracking-wide text-red-400">
                  SETTLEMENT LOCK · FUNDS NOT DISBURSED
                </p>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-red-400/80">
                  total path 32.6ms · verdict HALT
                </p>
              </div>
            ) : (
              <div className="border-t border-white/[0.06] px-4 py-3">
                <p className="font-mono text-[10px] text-[#5C6678]">
                  evaluating stages…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
