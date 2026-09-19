import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Docs / OpenAPI",
  description:
    "AFIE evaluate API reference — synchronous pre-disbursement risk decisions.",
};

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/evaluate",
    desc: "Synchronous risk decision. Returns ALLOW | CHALLENGE | HALT within the 40ms envelope.",
  },
  {
    method: "GET",
    path: "/v1/health",
    desc: "Cluster liveness and p50 latency for the global evaluation path.",
  },
  {
    method: "POST",
    path: "/v1/webhooks/test",
    desc: "Validate webhook signature and replay buffer for core banking connectors.",
  },
] as const;

export default function DocsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">OPENAPI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Docs / API
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Base URL{" "}
          <code className="rounded border border-white/[0.08] bg-[#111827] px-1.5 py-0.5 font-mono text-[12px] text-emerald-400">
            https://api.afie.io
          </code>
          . Authenticate with{" "}
          <code className="font-mono text-[12px] text-[#C5CCD6]">
            Authorization: Bearer &lt;key&gt;
          </code>
          .
        </p>

        <div className="mt-10 space-y-3">
          {ENDPOINTS.map((ep) => (
            <article
              key={ep.path}
              className="afie-card flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5"
            >
              <span className="shrink-0 font-mono text-[11px] font-semibold text-emerald-400">
                {ep.method}
              </span>
              <div>
                <p className="font-mono text-sm text-white">{ep.path}</p>
                <p className="mt-2 text-sm text-[#8B95A8]">{ep.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 afie-card rounded-lg p-5">
          <p className="font-mono text-[11px] text-[#5C6678]">response schema</p>
          <pre className="mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-[#C5CCD6]">{`{
  "decision": "HALT",
  "risk_score": 0.89,
  "latency_ms": 32,
  "reason_codes": ["ERR_DEVICE_REUSE_CLUSTER"]
}`}</pre>
        </div>

        <Link
          href="/integrations#playground"
          className="mt-8 inline-flex text-sm text-emerald-400 hover:text-emerald-300"
        >
          Open interactive playground →
        </Link>
      </div>
    </SiteShell>
  );
}
