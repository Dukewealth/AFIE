import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-20 text-zinc-100">
      <main className="w-full max-w-2xl space-y-8">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-emerald-400 uppercase">
            Autonomous Fraud Intelligence Engine
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            AFIE Engine
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
            Sub-200ms autonomous fraud evaluation with deterministic heuristics,
            AI forensic escalation, and a live risk operations dashboard.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 transition hover:border-emerald-500/40 hover:bg-zinc-900/80"
          >
            <p className="text-sm font-medium text-zinc-100">Operations dashboard</p>
            <p className="mt-1 text-xs text-zinc-500">
              Live transaction feed, KPIs, and forensic deep-dives
            </p>
          </Link>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
            <p className="text-sm font-medium text-zinc-100">Evaluate API</p>
            <p className="mt-1 font-mono text-xs text-emerald-400">
              POST /api/v1/evaluate
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
          <p className="text-sm font-medium text-emerald-300">One-command demo</p>
          <code className="mt-2 block font-mono text-xs text-zinc-300">
            npm run dev:demo
          </code>
          <p className="mt-2 text-xs text-zinc-500">
            Starts the API and traffic simulator together. Open the dashboard to watch live.
          </p>
        </div>
      </main>
    </div>
  );
}
