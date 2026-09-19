"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const PRIMARY = [
  { href: "/engine", label: "Engine" },
  { href: "/network", label: "Network" },
  { href: "/integrations", label: "Integrations" },
  { href: "/compliance", label: "Compliance" },
] as const;

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${
        active ? "text-white" : "text-[#8B95A8] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06080D]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="font-semibold tracking-tight text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(160deg, #f5f7fa 0%, #a8b0bd 45%, #e8ecf2 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              AFIE
            </span>
            <span className="hidden items-center gap-1.5 font-mono text-[10px] text-[#8B95A8] sm:inline-flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              <span className="tabular-nums">99.994%</span>
              <span className="text-[#5C6678]">ENGINE UPTIME</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
            {PRIMARY.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/dashboard"
            className="rounded-md border border-white/[0.08] px-3 py-1.5 text-sm text-[#C5CCD6] transition hover:border-white/[0.14] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            Live Sandbox
          </Link>
          <Link
            href="/integrations#playground"
            className="rounded-md border border-white/[0.08] px-3 py-1.5 text-sm text-[#C5CCD6] transition hover:border-white/[0.14] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            Docs / OpenAPI
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-[#06080D] transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            Launch Console
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex rounded-md border border-white/[0.08] p-2 text-[#C5CCD6] md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/[0.06] bg-[#0B0F17] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm text-[#C5CCD6]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm text-emerald-400">
              Launch Console
            </Link>
            <Link
              href="/integrations#playground"
              onClick={() => setOpen(false)}
              className="text-sm text-[#C5CCD6]"
            >
              Docs / OpenAPI
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
