"use client";

import type { DashboardKpis, LiveConnectionState, ThreatLevel } from "@/lib/dashboard/types";
import { formatPercent } from "@/lib/dashboard/format";

/** Escudo severity labels mapped from internal threat levels. */
const SEVERITY_LABEL: Record<ThreatLevel, "Guarded" | "Elevated" | "Critical"> = {
  Low: "Guarded",
  Elevated: "Elevated",
  High: "Critical",
};

const SEVERITY_TONE: Record<ThreatLevel, string> = {
  Low: "text-emerald-400",
  Elevated: "text-amber-400",
  High: "text-rose-400",
};

const SEVERITY_COPY: Record<ThreatLevel, string> = {
  Low: "Nominal pressure across the evaluation window",
  Elevated: "Challenge and block volume rising",
  High: "Autonomous blocks dominating the tape",
};

export function KpiHeader({
  kpis,
  connection,
}: {
  kpis: DashboardKpis;
  connection: LiveConnectionState;
}) {
  const fill =
    kpis.threatLevel === "High" ? 88 : kpis.threatLevel === "Elevated" ? 54 : 22;

  return (
    <section className="space-y-4 print:hidden">
      {/* Risk Horizon */}
      <div className="overflow-hidden rounded-md border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-2.5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
              Risk horizon · 24h pressure
            </p>
            <p className={`mt-0.5 text-sm font-medium ${SEVERITY_TONE[kpis.threatLevel]}`}>
              {SEVERITY_LABEL[kpis.threatLevel]} · {SEVERITY_COPY[kpis.threatLevel]}
            </p>
          </div>
          <IngestChip state={connection} />
        </div>
        <div className="relative h-10 bg-[#0B0F19]">
          <div
            className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 rounded-sm opacity-90"
            style={{
              background:
                "linear-gradient(90deg, #059669 0%, #d97706 52%, #e11d48 100%)",
            }}
          />
          <div
            className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-[left] duration-500"
            style={{ left: `calc(${fill}% - 0.5rem)` }}
            aria-hidden
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.16em] text-slate-600 uppercase">
            Guarded → Critical
          </span>
        </div>
      </div>

      {/* Metric quadrants */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total scanned (24h)"
          value={kpis.totalEvaluated24h.toLocaleString()}
          subtitle="Evaluations ingested"
        />
        <MetricCard
          label="Autonomous block rate"
          value={formatPercent(kpis.blockRate)}
          subtitle={`${kpis.blockedCount24h.toLocaleString()} blocked`}
          tone={kpis.blockRate >= 12 ? "hot" : kpis.blockRate >= 5 ? "warn" : "ok"}
        />
        <MetricCard
          label="Mean processing latency"
          value={`${kpis.averageLatencyMs}`}
          suffix="ms"
          subtitle="Heuristic + forensic path"
        />
        <MetricCard
          label="Active threat severity"
          value={SEVERITY_LABEL[kpis.threatLevel]}
          subtitle={`${kpis.challengedCount24h.toLocaleString()} challenged`}
          tone={
            kpis.threatLevel === "High"
              ? "hot"
              : kpis.threatLevel === "Elevated"
                ? "warn"
                : "ok"
          }
        />
      </div>
    </section>
  );
}

function IngestChip({ state }: { state: LiveConnectionState }) {
  const label =
    state === "live"
      ? "CDC live"
      : state === "demo"
        ? "Local ingest"
        : state === "connecting"
          ? "Linking"
          : "Offline";

  return (
    <span className="inline-flex items-center gap-2 rounded border border-slate-800/80 bg-[#0B0F19]/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-slate-300 uppercase">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "live" || state === "demo"
            ? "animate-pulse bg-emerald-400"
            : state === "connecting"
              ? "animate-pulse bg-amber-400"
              : "bg-rose-400"
        }`}
      />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  subtitle,
  tone = "neutral",
}: {
  label: string;
  value: string;
  suffix?: string;
  subtitle: string;
  tone?: "neutral" | "ok" | "warn" | "hot";
}) {
  const valueClass =
    tone === "hot"
      ? "text-rose-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "ok"
          ? "text-emerald-400"
          : "text-slate-100";

  return (
    <article className="rounded-md border border-slate-800/80 bg-slate-900/60 px-4 py-3 backdrop-blur-sm">
      <p className="font-mono text-[10px] tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </p>
      <p className={`mt-2 font-mono text-2xl leading-none tracking-tight ${valueClass}`}>
        {value}
        {suffix ? <span className="ml-1 text-sm text-slate-500">{suffix}</span> : null}
      </p>
      <p className="mt-2 font-mono text-[11px] text-slate-500">{subtitle}</p>
    </article>
  );
}
