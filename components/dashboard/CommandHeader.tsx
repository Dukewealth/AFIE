"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FileWarning, Play, Search, UserRound } from "lucide-react";

export function CommandHeader({
  p99Ms,
  operational,
  onExportSar,
  onRunSimulator,
  searchQuery,
  onSearchChange,
}: {
  p99Ms: number;
  operational: boolean;
  onExportSar: () => void;
  onRunSimulator: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#05070B]/92 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4 lg:gap-4">
        {/* Cluster status */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-tight text-slate-100"
          >
            AFIE
          </Link>
          <span
            className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${
              operational
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-rose-500/20 bg-rose-500/10"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {operational ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              )}
            </span>
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase ${
                operational ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <span className="hidden sm:inline">Engine Cluster: </span>
              {operational ? "Operational" : "Degraded"}
            </span>
            <span
              className={`hidden font-mono text-[10px] tabular-nums md:inline ${
                operational ? "text-emerald-400/80" : "text-rose-400/80"
              }`}
            >
              P99: {p99Ms.toFixed(1)}ms
            </span>
          </span>
        </div>

        {/* Omni search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Phone · NID hash · Wallet · Txn ID…"
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0A0E17] py-2 pr-16 pl-9 font-mono text-xs text-slate-200 placeholder:text-slate-600 outline-none transition hover:border-white/[0.18] focus:border-blue-500/40 focus:bg-[#0F1626]"
            aria-label="Global entity lookup"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline">
            ⌘K
          </kbd>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunSimulator}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Run Simulator</span>
          </button>
          <button
            type="button"
            onClick={onExportSar}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-[#05070B] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            <FileWarning className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export SAR</span>
          </button>
          <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0A0E17] px-2.5 py-1.5 text-xs text-slate-300 md:inline-flex">
            <UserRound className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">analyst.ops</span>
          </span>
        </div>
      </div>
    </header>
  );
}
