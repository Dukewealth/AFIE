"use client";

import { useEffect } from "react";
import { Fingerprint, Globe, Hash, ShieldAlert, Sparkles, X } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  countryFlag,
  formatAbsoluteTime,
  formatAmount,
  formatCountry,
  formatRail,
} from "@/lib/dashboard/format";
import type { DashboardTransaction, ForensicPayload } from "@/lib/dashboard/types";

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

  const rules = forensics?.triggeredRules ?? [];
  const reason = forensics?.forensicReason ?? transaction.decision_reason;
  const rawJson = forensics?.rawAudit ?? {
    decision_reason: transaction.decision_reason,
    pending_audit: true,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close forensic panel"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="forensic-title"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--dash-line)] bg-[var(--dash-panel)] shadow-[-24px_0_60px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--dash-line)] px-5 py-4">
          <div>
            <p className="dashboard-kicker">Forensic dossier</p>
            <h2 id="forensic-title" className="mt-1 font-mono text-sm text-[var(--dash-paper)]">
              {transaction.external_tx_id}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatAbsoluteTime(transaction.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[var(--dash-line)] p-1.5 text-slate-400 transition hover:text-[var(--dash-paper)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={transaction.status} />
            <span className="font-mono text-xs text-slate-400">
              risk {transaction.risk_score} · {transaction.latency_ms ?? "—"} ms
            </span>
          </div>

          <section className="space-y-2">
            <SectionLabel icon={Globe} title="Geolocation & IP" />
            <div className="dashboard-inset">
              <p className="text-sm text-[var(--dash-paper)]">
                {countryFlag(transaction.country_code)}{" "}
                {formatCountry(transaction.country_code)}
              </p>
              <p className="mt-2 font-mono text-xs text-[var(--dash-signal)]">
                {transaction.ip_address ?? "IP not recorded"}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel icon={Fingerprint} title="Device fingerprint" />
            <div className="dashboard-inset break-all font-mono text-xs text-slate-300">
              {transaction.device_fingerprint ?? "Fingerprint not recorded"}
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel icon={ShieldAlert} title="Triggered heuristic rules" />
            {loading && rules.length === 0 ? (
              <p className="text-xs text-slate-500">Reading heuristic audit…</p>
            ) : rules.length > 0 ? (
              <ul className="space-y-2">
                {rules.map((rule) => (
                  <li
                    key={rule}
                    className="dashboard-inset flex items-start gap-2 font-mono text-xs text-slate-200"
                  >
                    <Hash className="mt-0.5 h-3 w-3 shrink-0 text-[var(--dash-signal)]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                No heuristic flags were attached to this evaluation.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <SectionLabel icon={Sparkles} title="AI forensic reasoning" />
            <p className="dashboard-inset text-sm leading-relaxed text-slate-200">
              {reason || "No forensic statement was recorded."}
            </p>
          </section>

          <section className="space-y-2">
            <SectionLabel icon={Hash} title="Raw audit payload" />
            {error ? (
              <p className="text-xs text-rose-300">{error}</p>
            ) : (
              <pre className="dashboard-inset max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-400">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: typeof Globe;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
      <h3 className="dashboard-kicker">{title}</h3>
    </div>
  );
}
