import Link from "next/link";
import { SiteNav } from "@/components/site/SiteNav";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="afie-grid min-h-screen text-[#E8EDF5]">
      <SiteNav />
      <main>{children}</main>
      <footer className="border-t border-white/[0.06] bg-[#06080D]/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm text-[#C5CCD6]">
              AFIE · Autonomous Fraud Intelligent Engine
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#5C6678]">
              Inline pre-auth · Sub-40ms · Fail-open with async replay
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#8B95A8]">
            <Link href="/engine" className="hover:text-white">
              Engine
            </Link>
            <Link href="/network" className="hover:text-white">
              Network
            </Link>
            <Link href="/integrations" className="hover:text-white">
              Integrations
            </Link>
            <Link href="/compliance" className="hover:text-white">
              Compliance
            </Link>
            <Link href="/dashboard" className="hover:text-white">
              Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
