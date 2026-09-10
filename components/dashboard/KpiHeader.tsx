"use client";

import { Activity, Gauge, ShieldOff, Siren } from "lucide-react";
import { formatPercent } from "@/lib/dashboard/format";
import type { DashboardKpis, LiveConnectionState, ThreatLevel } from "@/lib/dashboard/types";

const THREAT_COPY: Record<ThreatLevel, string> = {
  Low: "Nominal pressure across the last 24 hours",
  Elevated: "Challenge volume or blocks are climbing",
  High: "Autonomous blocks are running hot",
};

const THREAT_TONE: Record<ThreatLevel, string> = {
  Low: "text-emerald-300",
  Elevated: "text-amber-200",
  High: "text-rose-300",
};

export function KpiHeader({
  kpis,
  connection,
  mode,
}: {
  kpis: DashboardKpis;
  connection: LiveConnectionState;
  mode: "live" | "demo";
}) {
  const fill =
    kpis.threatLevel === "High" ? 86 : kpis.threatLevel === "Elevated" ? 52 : 18;

  return (
    <section className="space-y-4">
      {mode === "demo" ? (
        <div className="rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Local mode — dashboard auto-refreshes every 2s. Run{" "}
          <code className="font-mono text-xs">npm run simulate</code> to feed live
          evaluations. Add Supabase keys for production persistence.
        </div>
      ) : null}

      <div className="dashboard-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--dash-line)] px-4 py-3 sm:px-5">
          <div>
            <p className="dashboard-kicker">Threat horizon · 24h pressure</p>
            <p className={`mt-1 font-medium ${THREAT_TONE[kpis.threatLevel]}`}>
              {kpis.threatLevel} · {THREAT_COPY[kpis.threatLevel]}
            </p>
          </div>
          <ConnectionChip state={connection} />
        </div>
        <div className="relative h-10 bg-[var(--dash-ink)]">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--dash-line)]" />
          <div
            className="threat-fill absolute inset-y-2 left-2 rounded-sm"
            style={{ width: `calc(${fill}% - 1rem)` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Total evaluated"
          value={kpis.totalEvaluated24h.toLocaleString()}
          hint="Last 24 hours"
        />
        <KpiCard
          icon={ShieldOff}
          label="Autonomous block rate"
          value={formatPercent(kpis.blockRate)}
          hint={`${kpis.blockedCount24h.toLocaleString()} blocked`}
          tone={kpis.blockRate >= 12 ? "hot" : kpis.blockRate >= 5 ? "warn" : "ok"}
        />
        <KpiCard
          icon={Gauge}
          label="Avg processing latency"
          value={`${kpis.averageLatencyMs}`}
          suffix="ms"
          hint="Heuristic + forensic path"
        />
        <KpiCard
          icon={Siren}
          label="Threat alert status"
          value={kpis.threatLevel}
          hint={`${kpis.challengedCount24h.toLocaleString()} challenged`}
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

function ConnectionChip({ state }: { state: LiveConnectionState }) {
  const label =
    state === "live"
      ? "Live feed"
      : state === "demo"
        ? "Demo feed"
        : state === "connecting"
          ? "Linking"
          : "Offline";

  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-[var(--dash-line)] bg-[var(--dash-ink)] px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-slate-300 uppercase">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "live"
            ? "bg-[var(--dash-signal)] shadow-[0_0_10px_var(--dash-signal)]"
            : state === "demo"
              ? "bg-amber-300"
              : state === "connecting"
                ? "animate-pulse bg-amber-300"
                : "bg-rose-400"
        }`}
      />
      {label}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  tone = "neutral",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  tone?: "neutral" | "ok" | "warn" | "hot";
}) {
  const valueClass =
    tone === "hot"
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-200"
        : tone === "ok"
          ? "text-emerald-300"
          : "text-[var(--dash-paper)]";

  return (
    <article className="dashboard-panel px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        <p className="dashboard-kicker">{label}</p>
      </div>
      <p className={`mt-3 font-mono text-3xl leading-none tracking-tight ${valueClass}`}>
        {value}
        {suffix ? <span className="ml-1 text-sm text-slate-500">{suffix}</span> : null}
      </p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </article>
  );
}
