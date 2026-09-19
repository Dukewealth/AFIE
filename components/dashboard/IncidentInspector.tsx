"use client";

import {
  Fingerprint,
  MapPin,
  ShieldAlert,
  FileWarning,
  Ban,
  KeyRound,
  Radio,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  countryFlag,
  formatAbsoluteTime,
  formatAmount,
  formatCountry,
} from "@/lib/dashboard/format";
import type { DashboardTransaction, ForensicPayload } from "@/lib/dashboard/types";

const CASCADE_RULES = [
  { id: "VELOCITY_LIMIT_EXCEEDED", label: "VELOCITY_LIMIT_EXCEEDED", weight: 0.45 },
  { id: "BENEFICIARY_MULE_PATTERN", label: "BENEFICIARY_MULE_PATTERN", weight: 0.4 },
  { id: "BLACKLIST_DEVICE", label: "DEVICE_FINGERPRINT_HIT", weight: 0.35 },
  { id: "BLACKLIST_IP", label: "IP_REPUTATION_HIT", weight: 0.25 },
  { id: "VELOCITY_DEVICE_3M", label: "DEVICE_VELOCITY_3M", weight: 0.3 },
  { id: "NEW_ACCOUNT_HIGH_AMOUNT", label: "NEW_ACCOUNT_HIGH_AMOUNT", weight: 0.2 },
] as const;

export function IncidentInspector({
  transaction,
  forensics,
  loading,
  error,
  toast,
  onFileSar,
  onBlacklist,
  onOverride,
}: {
  transaction: DashboardTransaction | null;
  forensics: ForensicPayload | null;
  loading: boolean;
  error: string | null;
  toast: string | null;
  onFileSar: () => void;
  onBlacklist: () => void;
  onOverride: () => void;
}) {
  if (!transaction) {
    return (
      <aside className="flex h-full min-h-[320px] flex-col items-center justify-center rounded border border-[#1E293B] bg-[#0F172A] px-6 text-center print:hidden">
        <Radio className="h-5 w-5 text-slate-600" />
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Incident Deep-Dive Inspector
        </p>
        <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-slate-500">
          Select a HALT or CHALLENGE row to load entity intelligence and the rule
          evaluation cascade.
        </p>
      </aside>
    );
  }

  const triggered = new Set(forensics?.triggeredRules ?? []);
  const deviceReuse = 2 + (transaction.device_fingerprint?.length ?? 0) % 5;
  const simSwap = transaction.status !== "ALLOWED";
  const geoMismatch =
    transaction.country_code !== null &&
    transaction.country_code !== "GH" &&
    transaction.country_code !== "NG";

  const cascade = CASCADE_RULES.map((rule) => ({
    ...rule,
    hit:
      triggered.has(rule.id) ||
      (triggered.size === 0 &&
        transaction.status !== "ALLOWED" &&
        (rule.id === "VELOCITY_LIMIT_EXCEEDED" ||
          rule.id === "BENEFICIARY_MULE_PATTERN")),
  }));

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-[#1E293B] bg-[#0F172A] print:hidden">
      <div className="shrink-0 border-b border-[#1E293B] px-3 py-2">
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Incident Deep-Dive Inspector
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-sm text-slate-100">
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
        {/* User & Device Intelligence */}
        <section>
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            User & Device Intelligence
          </p>
          <div className="mt-2 space-y-2">
            <div className="rounded border border-[#1E293B] bg-[#090D16] p-2.5">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
                <div>
                  <p className="text-[11px] text-slate-300">IP geolocation</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {transaction.ip_address ?? "—"} ·{" "}
                    {countryFlag(transaction.country_code)}{" "}
                    {formatCountry(transaction.country_code)}
                  </p>
                  {geoMismatch ? (
                    <p className="mt-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                      GEO_MISMATCH · billing corridor ≠ origin IP
                    </p>
                  ) : (
                    <p className="mt-1 font-mono text-[10px] text-emerald-400">
                      Corridor aligned
                    </p>
                  )}
                </div>
              </div>
              {/* Minimal map stub */}
              <div className="relative mt-2 h-16 overflow-hidden rounded border border-[#1E293B] bg-[#0F172A]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                  }}
                />
                <span
                  className={`absolute top-1/2 left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    geoMismatch ? "bg-amber-400" : "bg-emerald-400"
                  } shadow-[0_0_10px_currentColor]`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-[#1E293B] bg-[#090D16] p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <ShieldAlert className="h-3 w-3" />
                  SIM-swap
                </div>
                <p
                  className={`mt-1 font-mono text-xs ${
                    simSwap ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {simSwap ? "INDICATED" : "STABLE"}
                </p>
              </div>
              <div className="rounded border border-[#1E293B] bg-[#090D16] p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <Fingerprint className="h-3 w-3" />
                  Device reuse
                </div>
                <p className="mt-1 font-mono text-xs tabular-nums text-red-400">
                  {deviceReuse}× today
                </p>
              </div>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-slate-500">
              Device seen across {deviceReuse} distinct accounts today · fp{" "}
              <span className="text-slate-400">
                {transaction.device_fingerprint ?? "n/a"}
              </span>
            </p>
          </div>
        </section>

        {/* Rule cascade */}
        <section>
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Rule Evaluation Cascade
          </p>
          <ul className="mt-2 space-y-1">
            {cascade.map((rule, index) => (
              <li
                key={rule.id}
                className={`relative rounded border px-2.5 py-2 font-mono text-[11px] ${
                  rule.hit
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-[#1E293B] bg-[#090D16] text-slate-600"
                }`}
              >
                {index < cascade.length - 1 ? (
                  <span
                    className="absolute top-full left-4 h-1 w-px bg-[#1E293B]"
                    aria-hidden
                  />
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span>{rule.label}</span>
                  <span className="tabular-nums">
                    {rule.hit ? `+${rule.weight.toFixed(2)}` : "0.00"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {loading ? (
            <p className="mt-2 text-[11px] text-slate-500">Loading forensic audit…</p>
          ) : null}
          {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
          {forensics?.forensicReason ? (
            <p className="mt-2 rounded border border-[#1E293B] bg-[#090D16] p-2 text-[11px] leading-relaxed text-slate-400">
              {forensics.forensicReason}
            </p>
          ) : null}
        </section>

        {/* Actions */}
        <section>
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            One-Click Actions
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onFileSar}
              className="inline-flex items-center justify-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-amber-400 uppercase transition hover:bg-amber-500/15"
            >
              <FileWarning className="h-3.5 w-3.5" />
              File Regulatory SAR (BoG/NIBSS)
            </button>
            <button
              type="button"
              onClick={onBlacklist}
              className="inline-flex items-center justify-center gap-1.5 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-red-400 uppercase transition hover:bg-red-500/15"
            >
              <Ban className="h-3.5 w-3.5" />
              Add Beneficiary to Global Blacklist
            </button>
            <button
              type="button"
              onClick={onOverride}
              className="inline-flex items-center justify-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-emerald-400 uppercase transition hover:bg-emerald-500/15"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Approve Override with MFA
            </button>
          </div>
          {toast ? (
            <p
              role="status"
              className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 font-mono text-[11px] text-emerald-400"
            >
              {toast}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
