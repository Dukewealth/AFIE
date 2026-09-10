"use client";

import { useCallback, useEffect, useState } from "react";
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
}: DashboardClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [kpis, setKpis] = useState<DashboardKpis>(initialKpis);
  const [connection, setConnection] = useState<LiveConnectionState>(
    mode === "demo" ? "demo" : "connecting",
  );
  const [selected, setSelected] = useState<DashboardTransaction | null>(null);
  const [forensics, setForensics] = useState<ForensicPayload | null>(null);
  const [forensicsLoading, setForensicsLoading] = useState(false);
  const [forensicsError, setForensicsError] = useState<string | null>(null);

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
      setConnection("demo");

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
      console.error("[AFIE] Realtime subscription failed:", error);
      setConnection("offline");
      return undefined;
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

  return (
    <>
      <KpiHeader kpis={kpis} connection={connection} mode={mode} />
      <div className="mt-6">
        <TransactionStream
          transactions={transactions}
          selectedId={selected?.id ?? null}
          onSelect={openForensics}
        />
      </div>
      <ForensicDrawer
        transaction={selected}
        forensics={forensics}
        loading={forensicsLoading}
        error={forensicsError}
        onClose={closeForensics}
      />
    </>
  );
}
