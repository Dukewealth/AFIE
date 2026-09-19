import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { LatencyBudget } from "@/components/engine/LatencyBudget";

export const metadata: Metadata = {
  title: "Engine | AFIE Inline Halting Pipeline",
  description:
    "Architecture comparison of post-mortem batch auditing vs AFIE inline pre-auth halting with a 36ms latency budget.",
};

export default function EnginePage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">ENGINE ARCHITECTURE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Inline halting vs post-mortem audit
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Traditional stacks discover fraud after settlement. AFIE decides before
          the ledger posts — with a fail-open path so payments never stall.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-red-500/20 bg-red-500/10 p-5 sm:p-6">
            <p className="font-mono text-[11px] text-red-400/80">TRADITIONAL</p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Post-mortem batch auditing
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[#C5CCD6]">
              <li>Nightly / T+1 file review</li>
              <li>Funds already left the ledger</li>
              <li>Recovery depends on chargeback & police</li>
            </ul>
            <p className="mt-6 font-mono text-2xl tabular-nums text-red-400">
              Losses ≈ 100%
            </p>
            <p className="mt-1 text-xs text-red-400/70">of detected fraud capital</p>
          </article>

          <article className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-5 sm:p-6">
            <p className="font-mono text-[11px] text-emerald-400/80">AFIE</p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Inline pre-auth halting
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[#C5CCD6]">
              <li>Synchronous verdict at disbursement gate</li>
              <li>Settlement lock on HALT / CHALLENGE</li>
              <li>Deterministic reason codes for audit</li>
            </ul>
            <p className="mt-6 font-mono text-2xl tabular-nums text-emerald-400">
              Losses ≈ 0.01%
            </p>
            <p className="mt-1 text-xs text-emerald-400/70">residual after halt path</p>
          </article>
        </div>

        <div className="mt-8">
          <LatencyBudget />
        </div>

        <div className="mt-8 afie-card rounded-lg p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">
            Fail-open reliability
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#8B95A8]">
            If the evaluation path exceeds budget or Redis is unreachable, AFIE
            fails open: the payment continues, an async event is enqueued for
            forensic replay, and RiskOps receives a deferred alert. Core banking
            never blocks on AFIE availability — only on an explicit HALT within
            the latency envelope.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Hard timeout", "40ms"],
              ["Default on timeout", "ALLOW + enqueue"],
              ["Replay lag target", "< 2s"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-md border border-white/[0.06] bg-[#06080D] px-3 py-3"
              >
                <p className="text-[11px] text-[#5C6678]">{k}</p>
                <p className="mt-1 font-mono text-sm tabular-nums text-white">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
