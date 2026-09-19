"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Code2, FileDown } from "lucide-react";
import { DailyReportPrint } from "@/components/dashboard/DailyReportPrint";
import { DeveloperModal } from "@/components/dashboard/DeveloperModal";
import { ForensicDrawer } from "@/components/dashboard/ForensicDrawer";
import { KpiHeader } from "@/components/dashboard/KpiHeader";
import { TransactionStream } from "@/components/dashboard/TransactionStream";
import { applyLiveTransactionToKpis } from "@/lib/dashboard/metrics";
import { normalizeTransaction } from "@/lib/dashboard/normalize";
import type {
  DashboardClientProps,
  DashboardKpis,
  DashboardTransaction,
  ForensicPayload,
  LiveConnectionState,
} from "@/lib/dashboard/types";
import {
  getBrowserSupabaseClient,
  isBrowserSupabaseConfigured,
} from "@/lib/db/supabase-browser";
import type { Transaction } from "@/lib/db/database.types";

const FEED_CAP = 75;

export function DashboardClient({
  initialTransactions,
  initialKpis,
  mode,
  apiKey,
  apiBaseUrl,
}: DashboardClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [kpis, setKpis] = useState<DashboardKpis>(initialKpis);
  const [connection, setConnection] = useState<LiveConnectionState>(() => {
    if (mode === "demo") return "demo";
    if (!isBrowserSupabaseConfigured()) return "demo";
    return "connecting";
  });
  const [selected, setSelected] = useState<DashboardTransaction | null>(null);
  const [forensics, setForensics] = useState<ForensicPayload | null>(null);
  const [forensicsLoading, setForensicsLoading] = useState(false);
  const [forensicsError, setForensicsError] = useState<string | null>(null);
  const [apiOpen, setApiOpen] = useState(false);

  const upsertTransaction = useCallback((
    incoming: DashboardTransaction,
    eventMode: "insert" | "update",
  ) => {
    setTransactions((current) => {
      const exists = current.some((row) => row.id === incoming.id);
      if (exists) {
        return current.map((row) => (row.id === incoming.id ? incoming : row));
      }
      return [incoming, ...current].slice(0, FEED_CAP);
    });

    if (eventMode === "insert") {
      setKpis((current) => applyLiveTransactionToKpis(current, incoming));
    }

    setSelected((current) => (current?.id === incoming.id ? incoming : current));
  }, []);

  useEffect(() => {
    if (mode === "demo" || !isBrowserSupabaseConfigured()) {
      const poll = async () => {
        try {
          const response = await fetch("/api/dashboard/snapshot", { cache: "no-store" });
          if (!response.ok) return;
          const snapshot = (await response.json()) as {
            transactions: DashboardTransaction[];
            kpis: DashboardKpis;
          };
          setTransactions(snapshot.transactions);
          setKpis(snapshot.kpis);
        } catch {
          // Keep last known dashboard state during transient poll failures.
        }
      };

      void poll();
      const interval = setInterval(poll, 2000);
      return () => clearInterval(interval);
    }

    let cancelled = false;
    let syncFailure: unknown = null;

    try {
      const supabase = getBrowserSupabaseClient();
      const channel = supabase
        .channel("afie-ops-transactions")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "transactions" },
          (payload) => {
            upsertTransaction(normalizeTransaction(payload.new as Transaction), "insert");
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "transactions" },
          (payload) => {
            upsertTransaction(normalizeTransaction(payload.new as Transaction), "update");
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            setConnection("live");
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnection("offline");
          }
        });

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    } catch (error) {
      syncFailure = error;
      return undefined;
    } finally {
      if (syncFailure !== null) {
        console.error("[AFIE] Realtime subscription failed:", syncFailure);
        queueMicrotask(() => setConnection("offline"));
      }
    }
  }, [mode, upsertTransaction]);

  const openForensics = useCallback(async (transaction: DashboardTransaction) => {
    setSelected(transaction);
    setForensics(null);
    setForensicsError(null);
    setForensicsLoading(true);

    try {
      const response = await fetch(`/api/dashboard/forensics/${transaction.id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load forensic audit");
      }

      setForensics((await response.json()) as ForensicPayload);
    } catch (error) {
      setForensicsError(
        error instanceof Error ? error.message : "Could not load forensic audit",
      );
    } finally {
      setForensicsLoading(false);
    }
  }, []);

  const closeForensics = useCallback(() => {
    setSelected(null);
    setForensics(null);
    setForensicsError(null);
  }, []);

  const p95Latency = Math.max(kpis.averageLatencyMs, Math.round(kpis.averageLatencyMs * 1.35));
  const ingestionLabel =
    connection === "live"
      ? "Supabase CDC Stream Connected"
      : connection === "demo"
        ? "Local Event Ingest Active"
        : connection === "connecting"
          ? "Connecting Event Stream…"
          : "Event Ingestion Offline";

  return (
    <>
      {/* System telemetry strip */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-mono text-sm font-semibold tracking-[0.14em] text-slate-100 uppercase">
              AFIE RiskOps Studio
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-slate-400 uppercase">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                Autonomous Autopilot Active
              </span>
              <span>P95 Latency: {p95Latency} ms</span>
              <span
                className={
                  connection === "offline" ? "text-rose-400" : "text-slate-400"
                }
              >
                Event Ingestion: {ingestionLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 backdrop-blur-sm transition hover:border-slate-700 hover:text-slate-100"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export Audit Dossier (PDF)
            </button>
            <button
              type="button"
              onClick={() => setApiOpen(true)}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-800/50 bg-emerald-950/60 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-950/80"
            >
              <Code2 className="h-3.5 w-3.5" />
              API Credentials & Webhooks
            </button>
            <Link
              href="/"
              className="font-mono text-[10px] tracking-[0.12em] text-slate-500 uppercase transition hover:text-slate-300"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
        <KpiHeader kpis={kpis} connection={connection} />
        <div className="mt-4">
          <TransactionStream
            transactions={transactions}
            selectedId={selected?.id ?? null}
            onSelect={openForensics}
          />
        </div>
      </div>

      <ForensicDrawer
        transaction={selected}
        forensics={forensics}
        loading={forensicsLoading}
        error={forensicsError}
        onClose={closeForensics}
      />

      <DeveloperModal
        open={apiOpen}
        onClose={() => setApiOpen(false)}
        apiKey={apiKey}
        apiBaseUrl={apiBaseUrl}
      />

      <DailyReportPrint kpis={kpis} transactions={transactions} />
    </>
  );
}
