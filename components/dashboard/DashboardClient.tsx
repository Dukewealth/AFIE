"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommandHeader } from "@/components/dashboard/CommandHeader";
import { DailyReportPrint } from "@/components/dashboard/DailyReportPrint";
import { DeveloperModal } from "@/components/dashboard/DeveloperModal";
import { IncidentInspector } from "@/components/dashboard/IncidentInspector";
import { RuleTuningDrawer } from "@/components/dashboard/RuleTuningDrawer";
import { TelemetryRow } from "@/components/dashboard/TelemetryRow";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [throughput, setThroughput] = useState(1180);

  const flash = useCallback((message: string) => {
    setActionToast(message);
    window.setTimeout(() => setActionToast(null), 2800);
  }, []);

  const upsertTransaction = useCallback(
    (incoming: DashboardTransaction, eventMode: "insert" | "update") => {
      setTransactions((current) => {
        const exists = current.some((row) => row.id === incoming.id);
        if (exists) {
          return current.map((row) => (row.id === incoming.id ? incoming : row));
        }
        return [incoming, ...current].slice(0, FEED_CAP);
      });

      if (eventMode === "insert") {
        setKpis((current) => applyLiveTransactionToKpis(current, incoming));
        setThroughput((t) => Math.min(2400, t + 3 + Math.floor(Math.random() * 8)));
      }

      setSelected((current) => (current?.id === incoming.id ? incoming : current));
    },
    [],
  );

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
          setThroughput((t) => 1100 + Math.floor(Math.random() * 280));
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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const hay = [
        tx.external_tx_id,
        tx.user_id,
        tx.device_fingerprint ?? "",
        tx.ip_address ?? "",
        tx.decision_reason ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, searchQuery]);

  return (
    <>
      <CommandHeader
        avgLatencyMs={kpis.averageLatencyMs || 34}
        throughputHint={connection === "offline" ? 0 : throughput}
        onOpenSearch={() => undefined}
        onExportSar={() => {
          flash("SAR packet queued · BoG/NIBSS export ready");
          window.print();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        <TelemetryRow kpis={kpis} transactions={transactions} />

        <div className="grid min-h-[560px] gap-3 lg:grid-cols-5 lg:items-stretch">
          <div className="min-h-[420px] lg:col-span-3">
            <TransactionStream
              transactions={filtered}
              selectedId={selected?.id ?? null}
              onSelect={openForensics}
              onRelease={(tx) => flash(`Hold released · ${tx.external_tx_id}`)}
              onConfirmFraud={(tx) =>
                flash(`Fraud confirmed · blacklist candidate ${tx.user_id}`)
              }
              onInspectGraph={(tx) => {
                void openForensics(tx);
                flash(`Entity graph focused · ${tx.device_fingerprint ?? tx.user_id}`);
              }}
            />
          </div>
          <div className="min-h-[420px] lg:col-span-2">
            <IncidentInspector
              transaction={selected}
              forensics={forensics}
              loading={forensicsLoading}
              error={forensicsError}
              toast={actionToast}
              onFileSar={() => {
                flash("Regulatory SAR filed (BoG/NIBSS format)");
                window.print();
              }}
              onBlacklist={() =>
                flash(
                  `Beneficiary hashed → global blacklist · ${selected?.user_id ?? ""}`,
                )
              }
              onOverride={() =>
                flash("Override pending MFA · step-up challenge issued")
              }
            />
          </div>
        </div>
      </div>

      <RuleTuningDrawer />

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
