import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { fetchDashboardSnapshot } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await fetchDashboardSnapshot();

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--dash-line)] bg-[var(--dash-panel)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="dashboard-kicker">AFIE · Risk operations</p>
            <h1 className="mt-1 text-xl font-medium tracking-tight text-[var(--dash-paper)]">
              Live evaluation console
            </h1>
          </div>
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.14em] text-slate-400 uppercase transition hover:text-[var(--dash-paper)]"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <DashboardClient
          initialTransactions={snapshot.transactions}
          initialKpis={snapshot.kpis}
          mode={snapshot.mode}
        />
      </div>
    </main>
  );
}
