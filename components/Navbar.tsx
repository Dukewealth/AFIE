"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, Terminal, X } from "lucide-react";

const CENTER_LINKS = [
  { href: "/network", label: "Network" },
  { href: "/engine", label: "Engine" },
  { href: "/integrations", label: "Integrations" },
  { href: "/docs", label: "Docs" },
  { href: "/compliance", label: "Compliance" },
  { href: "/pricing", label: "Pricing" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <div className="relative w-full max-w-6xl">
        <div className="pointer-events-auto relative flex h-14 w-full items-center justify-between rounded-full border border-white/[0.08] bg-[#0B0F17]/85 px-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3 sm:min-w-[200px]">
            <Link
              href="/"
              className="shrink-0 text-sm font-bold tracking-tight text-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
              style={{
                backgroundImage:
                  "linear-gradient(160deg, #f8fafc 0%, #94a3b8 42%, #e2e8f0 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              AFIE
            </Link>
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-mono font-medium tracking-wider text-emerald-400 uppercase">
                SYS: ONLINE{" "}
                <span className="tabular-nums text-emerald-400/80">(34ms)</span>
              </span>
            </span>
          </div>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {CENTER_LINKS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${
                    active
                      ? "bg-white/[0.08] text-white shadow-inner"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:min-w-[200px] sm:gap-3">
            <Link
              href="/docs"
              className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 md:inline-flex"
            >
              <Terminal className="h-3.5 w-3.5" />
              Docs / API
            </Link>
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 sm:inline-flex"
            >
              Launch Console
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              className="inline-flex rounded-full border border-white/[0.08] p-2 text-slate-300 lg:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="pointer-events-auto absolute top-[calc(100%+0.5rem)] right-0 left-0 rounded-2xl border border-white/[0.08] bg-[#0B0F17]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {CENTER_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isActive(pathname, item.href)
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/docs"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-300"
              >
                Docs / API
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-full bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-black"
              >
                Launch Console
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </div>
  );
}
