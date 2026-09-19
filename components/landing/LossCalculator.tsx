"use client";

import { useMemo, useState } from "react";

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function LossCalculator() {
  const [volume, setVolume] = useState(5_000_000);
  const [avgLoan, setAvgLoan] = useState(850);
  const [defaultRate, setDefaultRate] = useState(4.2);

  const math = useMemo(() => {
    const monthlyLoss = volume * (defaultRate / 100);
    // Assume AFIE recovers ~72% of post-audit fraud that would have settled
    const recoverable = monthlyLoss * 0.72;
    // Infrastructure cost scales gently with volume
    const afieCost = 2_800 + volume * 0.00018;
    const roi = afieCost > 0 ? recoverable / afieCost : 0;
    const loans = Math.round(volume / avgLoan);
    return { monthlyLoss, recoverable, afieCost, roi, loans };
  }, [volume, avgLoan, defaultRate]);

  return (
    <section className="border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Cost of inaction
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#8B95A8] sm:text-base">
            Model monthly disbursement exposure against post-audit leakage.
            Readout updates as you adjust volume, ticket size, and default rate.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="afie-card space-y-7 rounded-lg p-5 sm:p-6">
            <label className="block">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#C5CCD6]">Monthly disbursement volume</span>
                <span className="font-mono text-sm tabular-nums text-white">
                  {formatUsd(volume)}
                </span>
              </div>
              <input
                type="range"
                min={500_000}
                max={50_000_000}
                step={100_000}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-emerald-500"
                aria-valuetext={formatUsd(volume)}
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-[#5C6678]">
                <span>$500k</span>
                <span>$50M</span>
              </div>
            </label>

            <label className="block">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#C5CCD6]">Average loan size</span>
                <span className="font-mono text-sm tabular-nums text-white">
                  ${avgLoan}
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={5000}
                step={50}
                value={avgLoan}
                onChange={(e) => setAvgLoan(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#C5CCD6]">Post-audit default / fraud rate</span>
                <span className="font-mono text-sm tabular-nums text-amber-400">
                  {defaultRate.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.1}
                value={defaultRate}
                onChange={(e) => setDefaultRate(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </label>

            <p className="font-mono text-[11px] text-[#5C6678]">
              ~{math.loans.toLocaleString()} loans / month at current ticket size
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-5">
              <p className="text-xs text-red-400/80">Monthly post-audit loss</p>
              <p className="mt-2 font-mono text-3xl tabular-nums tracking-tight text-red-400">
                {formatUsd(math.monthlyLoss)}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-xs text-emerald-400/80">Capital recoverable pre-settlement</p>
              <p className="mt-2 font-mono text-3xl tabular-nums tracking-tight text-emerald-400">
                {formatUsd(math.recoverable)}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-[#0B0F17] p-5">
              <p className="text-xs text-[#8B95A8]">AFIE infrastructure cost / mo</p>
              <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight text-white">
                {formatUsd(math.afieCost)}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.12] bg-[#111827] p-5">
              <p className="text-xs text-[#8B95A8]">Implied ROI multiple</p>
              <p className="mt-2 font-mono text-3xl tabular-nums tracking-tight text-white">
                {math.roi.toFixed(1)}
                <span className="text-lg text-[#8B95A8]">x</span>
              </p>
              <p className="mt-2 text-xs text-[#5C6678]">
                Recoverable ÷ infrastructure at current inputs
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
