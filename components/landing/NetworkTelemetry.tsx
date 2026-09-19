"use client";

import { useEffect, useState } from "react";

const HUBS = [
  { city: "Accra", code: "ACC", base: 42 },
  { city: "Lagos", code: "LOS", base: 68 },
  { city: "Nairobi", code: "NBO", base: 51 },
  { city: "Johannesburg", code: "JNB", base: 37 },
] as const;

type HubStat = {
  city: string;
  code: string;
  evaluated: number;
  halted: number;
  p50: number;
};

export function NetworkTelemetry() {
  const [stats, setStats] = useState<HubStat[]>(() =>
    HUBS.map((h) => ({
      city: h.city,
      code: h.code,
      evaluated: h.base * 100 + 400,
      halted: Math.round(h.base * 0.8),
      p50: 28 + (h.base % 7),
    })),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((prev) =>
        prev.map((hub, i) => {
          const bump = 1 + Math.floor(Math.random() * 4);
          const haltBump = Math.random() > 0.72 ? 1 : 0;
          return {
            ...hub,
            evaluated: hub.evaluated + bump,
            halted: hub.halted + haltBump,
            p50: 26 + ((hub.evaluated + i) % 11),
          };
        }),
      );
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Live network telemetry
            </h2>
            <p className="mt-2 text-sm text-[#8B95A8]">
              Simulated evaluations across African settlement hubs.
            </p>
          </div>
          <p className="font-mono text-[10px] text-emerald-400">
            ● STREAMING
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((hub) => (
            <div key={hub.code} className="afie-card rounded-lg p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-white">{hub.city}</p>
                <p className="font-mono text-[10px] text-[#5C6678]">{hub.code}</p>
              </div>
              <p className="mt-4 font-mono text-2xl tabular-nums tracking-tight text-white">
                {hub.evaluated.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[#8B95A8]">evaluated today</p>
              <div className="mt-4 flex justify-between border-t border-white/[0.06] pt-3 font-mono text-[11px]">
                <span className="text-red-400 tabular-nums">
                  {hub.halted} halted
                </span>
                <span className="text-[#8B95A8] tabular-nums">p50 {hub.p50}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
