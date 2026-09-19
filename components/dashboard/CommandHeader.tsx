"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileWarning,
  Search,
  UserRound,
} from "lucide-react";

const INSTITUTIONS = [
  { id: "mfi-accra", label: "Accra Mutual MFI" },
  { id: "sl-lagos", label: "Lagos Savings & Loans" },
  { id: "ft-nairobi", label: "Nairobi PayRails" },
  { id: "mfi-jhb", label: "Johannesburg Credit Union" },
] as const;

export function CommandHeader({
  avgLatencyMs,
  throughputHint,
  onOpenSearch,
  onExportSar,
  searchQuery,
  onSearchChange,
}: {
  avgLatencyMs: number;
  throughputHint: number;
  onOpenSearch: () => void;
  onExportSar: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const [institution, setInstitution] = useState(INSTITUTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const active = INSTITUTIONS.find((i) => i.id === institution) ?? INSTITUTIONS[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenSearch();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSearch]);

  const throughput = useMemo(
    () => Math.max(120, throughputHint).toLocaleString(),
    [throughputHint],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#090D16]/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4 lg:gap-4">
        {/* Institution switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded border border-[#1E293B] bg-[#0F172A] px-2.5 py-1.5 text-left transition hover:border-slate-600"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Institution
              </span>
              <span className="block max-w-[160px] truncate text-xs font-medium text-slate-100 sm:max-w-[200px]">
                {active.label}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>
          {menuOpen ? (
            <ul
              role="listbox"
              className="absolute top-[calc(100%+4px)] left-0 z-50 min-w-[220px] overflow-hidden rounded border border-[#1E293B] bg-[#0F172A] shadow-xl"
            >
              {INSTITUTIONS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === institution}
                    className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-white/[0.04] ${
                      item.id === institution ? "text-emerald-400" : "text-slate-300"
                    }`}
                    onClick={() => {
                      setInstitution(item.id);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Engine status */}
        <div className="hidden items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 md:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
              Engine Status: Operational
            </p>
            <p className="font-mono text-[10px] tabular-nums text-emerald-400/80">
              {throughput} req/sec · Avg: {avgLatencyMs}ms
            </p>
          </div>
        </div>

        {/* Cmd+K search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Txn hash · Account · NID hash · MoMo…"
            className="w-full rounded border border-[#1E293B] bg-[#0F172A] py-2 pr-16 pl-8 font-mono text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
            aria-label="Search transactions"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-[#1E293B] bg-[#090D16] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
            ⌘K
          </kbd>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportSar}
            className="inline-flex items-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-amber-400 uppercase transition hover:bg-amber-500/15"
          >
            <FileWarning className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SAR Export</span>
          </button>
          <span className="inline-flex items-center gap-1.5 rounded border border-[#1E293B] bg-[#0F172A] px-2 py-1.5 text-xs text-slate-300">
            <UserRound className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden font-mono text-[11px] sm:inline">analyst.ops</span>
          </span>
          <Link
            href="/"
            className="hidden text-[10px] font-semibold tracking-wider text-slate-500 uppercase transition hover:text-slate-300 lg:inline"
          >
            Exit
          </Link>
        </div>
      </div>
    </header>
  );
}
