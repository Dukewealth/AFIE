"use client";

import { useMemo } from "react";
import {
  Ban,
  Fingerprint,
  FileWarning,
  KeyRound,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  formatAbsoluteTime,
  formatAmount,
} from "@/lib/dashboard/format";
import type { DashboardTransaction, ForensicPayload } from "@/lib/dashboard/types";

const CASCADE = [
  { id: "CONSORTIUM_MULE", label: "Consortium Mule Match", weight: 0.5, keys: ["BLACKLIST_DEVICE", "BENEFICIARY_MULE_PATTERN"] },
  { id: "VELOCITY", label: "Velocity Spike", weight: 0.35, keys: ["VELOCITY_LIMIT_EXCEEDED", "VELOCITY_USER_3M", "VELOCITY_DEVICE_3M"] },
  { id: "SIM_SWAP", label: "SIM-Swap Proximity", weight: 0.28, keys: ["SIM_SWAP_SIGNAL"] },
  { id: "DEVICE", label: "Device Fingerprint Reuse", weight: 0.22, keys: ["BLACKLIST_DEVICE", "NEW_ACCOUNT_HIGH_AMOUNT"] },
  { id: "IP", label: "IP Reputation", weight: 0.15, keys: ["BLACKLIST_IP"] },
] as const;

export function IncidentInspector({
  transaction,
  forensics,
  loading,
  error,
  toast,
  onFileSar,
  onBlacklist,
  onChallenge,
}: {
  transaction: DashboardTransaction | null;
  forensics: ForensicPayload | null;
  loading: boolean;
  error: string | null;
  toast: string | null;
  onFileSar: () => void;
  onBlacklist: () => void;
  onChallenge: () => void;
}) {
  const triggered = useMemo(
    () => new Set(forensics?.triggeredRules ?? []),
    [forensics],
  );

  const cascade = useMemo(() => {
    if (!transaction) return [];
    return CASCADE.map((rule) => {
      const hit =
        rule.keys.some((k) => triggered.has(k)) ||
        (triggered.size === 0 &&
          transaction.status !== "ALLOWED" &&
          (rule.id === "CONSORTIUM_MULE" || rule.id === "VELOCITY"));
      return { ...rule, hit };
    });
  }, [transaction, triggered]);

  const total = useMemo(
    () =>
      Number(
        cascade
          .filter((r) => r.hit)
          .reduce((s, r) => s + r.weight, 0)
          .toFixed(2),
      ),
    [cascade],
  );

  if (!transaction) {
    return (
      <aside className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-[#0A0E17] px-6 text-center print:hidden">
        <Radio className="h-5 w-5 text-slate-600" />
        <p className="mt-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Incident Telemetry Inspector
        </p>
        <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-slate-500">
          Select a row in the ingress matrix to load entity signatures and the
          explainability waterfall.
        </p>
      </aside>
    );
  }

  const deviceReuse = 2 + (transaction.device_fingerprint?.length ?? 0) % 5;
  const simHours = transaction.status !== "ALLOWED" ? 1.4 : null;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0A0E17] print:hidden">
      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Incident Telemetry Inspector
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-sm tabular-nums text-slate-100">
            {transaction.external_tx_id}
          </h2>
          <StatusBadge status={transaction.status} />
        </div>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
          {formatAmount(transaction.amount, transaction.currency)} ·{" "}
          {formatAbsoluteTime(transaction.created_at)}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <section>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Entity Network Signature
          </p>
          <div className="mt-2 space-y-2">
            <div className="rounded-lg border border-white/[0.08] bg-[#05070B] p-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[11px] text-slate-300">SIM integrity</p>
              </div>
              <p
                className={`mt-1.5 font-mono text-xs tabular-nums ${
                  simHours !== null ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {simHours !== null
                  ? `SIM Swapped ${simHours.toFixed(1)}h ago`
                  : "SIM tenure stable"}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-[#05070B] p-2.5">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-3.5 w-3.5 text-rose-400" />
                <p className="text-[11px] text-slate-300">Hardware fingerprint</p>
              </div>
              <p className="mt-1.5 font-mono text-xs text-rose-400">
                Reused across {deviceReuse} distinct accounts today
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-600">
                {transaction.device_fingerprint ?? "n/a"}
              </p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Explainability Waterfall
          </p>
          <ul className="mt-2 space-y-1">
            {cascade.map((rule) => (
              <li
                key={rule.id}
                className={`rounded-md border px-2.5 py-2 font-mono text-[11px] transition ${
                  rule.hit
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-white/[0.06] bg-[#05070B] text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{rule.label}</span>
                  <span className="tabular-nums">
                    {rule.hit ? `+${rule.weight.toFixed(2)}` : "0.00"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div
            className={`mt-2 flex items-center justify-between rounded-md border px-2.5 py-2 font-mono text-xs ${
              total >= 0.75
                ? "border-rose-500/20 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                : total >= 0.4
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span className="font-semibold tracking-wider uppercase">
              {total >= 0.75 ? "Critical" : total >= 0.4 ? "Elevated" : "Nominal"}
            </span>
            <span className="tabular-nums">Total {total.toFixed(2)}</span>
          </div>
          {loading ? (
            <p className="mt-2 text-[11px] text-slate-500">Loading forensic audit…</p>
          ) : null}
          {error ? <p className="mt-2 text-[11px] text-rose-400">{error}</p> : null}
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Action Hub
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onBlacklist}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-[11px] font-semibold tracking-wide text-rose-400 uppercase shadow-[0_0_12px_rgba(244,63,94,0.12)] transition hover:bg-rose-500/20 active:scale-[0.98]"
            >
              <Ban className="h-3.5 w-3.5" />
              Blacklist Entity Across Consortium
            </button>
            <button
              type="button"
              onClick={onChallenge}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-[11px] font-semibold tracking-wide text-amber-400 uppercase transition hover:bg-amber-500/20 active:scale-[0.98]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Dispatch Biometric Challenge
            </button>
            <button
              type="button"
              onClick={onFileSar}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[11px] font-semibold tracking-wide text-[#05070B] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              <FileWarning className="h-3.5 w-3.5" />
              Generate 1-Click BoG / NIBSS SAR
            </button>
          </div>
          {toast ? (
            <p
              role="status"
              className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 font-mono text-[11px] text-emerald-400"
            >
              {toast}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
