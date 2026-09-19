"use client";

import { useEffect } from "react";
import { Check, Circle, X } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  countryFlag,
  formatAbsoluteTime,
  formatAmount,
  formatCountry,
} from "@/lib/dashboard/format";
import type { DashboardTransaction, ForensicPayload } from "@/lib/dashboard/types";

const FAST_FILTER_RULES = [
  { id: "BLACKLIST_IP", label: "Blacklist IP lookup" },
  { id: "BLACKLIST_DEVICE", label: "Blacklist device lookup" },
  { id: "VELOCITY_USER_3M", label: "User velocity (3m window)" },
  { id: "VELOCITY_DEVICE_3M", label: "Device velocity (3m window)" },
  { id: "DAILY_SPEND_CAP", label: "Daily merchant spend cap ($5k)" },
  { id: "NEW_ACCOUNT_HIGH_AMOUNT", label: "New-account high amount" },
  { id: "AMOUNT_EXCEEDS_AVERAGE", label: "Amount vs rolling average" },
] as const;

export function ForensicDrawer({
  transaction,
  forensics,
  loading,
  error,
  onClose,
}: {
  transaction: DashboardTransaction | null;
  forensics: ForensicPayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const open = transaction !== null;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!transaction) return null;

  const triggered = new Set(forensics?.triggeredRules ?? []);
  const reason = forensics?.forensicReason ?? transaction.decision_reason;
  const accountAge = extractAccountAge(forensics);

  return (
    <div className="fixed inset-0 z-50 flex justify-end print:hidden">
      <button
        type="button"
        aria-label="Close case investigation"
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-investigation-title"
        className="escudo-drawer relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-[#0F172A] p-6 shadow-[-20px_0_48px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded border border-slate-700 p-1.5 text-slate-400 transition hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        {/* a) Case header */}
        <section className="pr-10">
          <p className="font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
            Case investigation
          </p>
          <h2
            id="case-investigation-title"
            className="mt-1 font-mono text-base text-slate-100"
          >
            {transaction.external_tx_id}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={transaction.status} />
            <span className="font-mono text-xs text-slate-400">
              {formatAmount(transaction.amount, transaction.currency)}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {formatAbsoluteTime(transaction.created_at)}
            </span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-slate-500">
            Risk score {transaction.risk_score} · Latency{" "}
            {transaction.latency_ms ?? "—"} ms
          </p>
        </section>

        {/* b) Entity dossier */}
        <section className="mt-8">
          <SectionTitle>Entity dossier</SectionTitle>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="IP address" value={transaction.ip_address ?? "—"} mono />
            <Field
              label="Country"
              value={`${countryFlag(transaction.country_code)} ${formatCountry(transaction.country_code)}`.trim()}
            />
            <Field
              label="Device fingerprint"
              value={transaction.device_fingerprint ?? "—"}
              mono
              className="sm:col-span-2"
            />
            <Field label="User ID" value={transaction.user_id} mono />
            <Field
              label="Account age"
              value={accountAge !== null ? `${accountAge} days` : "Not provided"}
            />
          </div>
        </section>

        {/* c) Fast-filter waterfall */}
        <section className="mt-8">
          <SectionTitle>Fast-filter waterfall</SectionTitle>
          <p className="mt-1 text-xs text-slate-500">
            Deterministic rules executed in the sub-30ms path
          </p>
          <ul className="mt-3 space-y-1.5">
            {FAST_FILTER_RULES.map((rule) => {
              const hit = triggered.has(rule.id);
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 rounded border px-2.5 py-2 font-mono text-xs ${
                    hit
                      ? "border-amber-800/50 bg-amber-950/40 text-amber-300"
                      : "border-slate-800 bg-slate-950/50 text-slate-500"
                  }`}
                >
                  {hit ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  )}
                  <span className="flex-1">{rule.label}</span>
                  <span className="text-[10px] tracking-wide uppercase">
                    {hit ? "Triggered" : "Clear"}
                  </span>
                </li>
              );
            })}
          </ul>
          {loading && triggered.size === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Loading heuristic audit…</p>
          ) : null}
        </section>

        {/* d) Explainable AI verdict */}
        <section className="mt-8">
          <SectionTitle>Explainable AI verdict</SectionTitle>
          <div className="mt-3 rounded border border-emerald-800/40 bg-emerald-950/30 px-3 py-3 text-sm leading-relaxed text-slate-200">
            {reason || "No forensic statement was recorded for this case."}
          </div>
          {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
        </section>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
      {children}
    </h3>
  );
}

function Field({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded border border-slate-800 bg-slate-950/50 px-2.5 py-2 ${className}`}>
      <p className="font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`mt-1 break-all text-xs text-slate-200 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function extractAccountAge(forensics: ForensicPayload | null): number | null {
  const details = forensics?.auditLogs.find((log) => log.stage === "HEURISTIC")?.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const metadata = details.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const age = metadata.account_age_days;
  return typeof age === "number" ? age : null;
}
