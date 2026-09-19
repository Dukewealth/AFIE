"use client";

import { useState } from "react";
import { ChevronUp, SlidersHorizontal } from "lucide-react";

type RuleToggle = {
  id: string;
  label: string;
  enabled: boolean;
};

const DEFAULT_RULES: RuleToggle[] = [
  { id: "auto_halt", label: "Automated HALT on consortium match", enabled: true },
  { id: "sim_swap", label: "SIM-swap step-up challenge", enabled: true },
  { id: "velocity", label: "Velocity burst auto-halt", enabled: true },
  { id: "insider", label: "Insider approval velocity gate", enabled: false },
];

export function RuleTuningDrawer() {
  const [open, setOpen] = useState(false);
  const [velocitySens, setVelocitySens] = useState(62);
  const [muleSens, setMuleSens] = useState(78);
  const [deviceSens, setDeviceSens] = useState(55);
  const [rules, setRules] = useState(DEFAULT_RULES);

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#1E293B] bg-[#0F172A] px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-300 uppercase shadow-lg transition hover:border-slate-600 hover:text-white"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Rule Performance & Risk Tuning
        <ChevronUp
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Rule tuning"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[#1E293B] bg-[#0F172A] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Dynamic Thresholds
                </p>
                <p className="text-xs text-slate-500">
                  Adjust sensitivities · changes apply to next evaluate cycle
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-[#1E293B] px-2 py-1 text-[11px] text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded border border-[#1E293B] bg-[#090D16] p-3">
                <Slider
                  label="Velocity sensitivity"
                  value={velocitySens}
                  onChange={setVelocitySens}
                />
                <Slider
                  label="Mule / beneficiary sensitivity"
                  value={muleSens}
                  onChange={setMuleSens}
                />
                <Slider
                  label="Device reuse sensitivity"
                  value={deviceSens}
                  onChange={setDeviceSens}
                />
              </div>

              <div className="rounded border border-[#1E293B] bg-[#090D16] p-3">
                <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Automated Halting Rules
                </p>
                <ul className="mt-3 space-y-2">
                  {rules.map((rule) => (
                    <li
                      key={rule.id}
                      className="flex items-center justify-between gap-3 border-b border-[#1E293B]/80 py-2 last:border-0"
                    >
                      <span className="text-xs text-slate-300">{rule.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        onClick={() =>
                          setRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id
                                ? { ...r, enabled: !r.enabled }
                                : r,
                            ),
                          )
                        }
                        className={`relative h-5 w-9 rounded-full transition ${
                          rule.enabled ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${
                            rule.enabled ? "translate-x-4" : ""
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-slate-200">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </label>
  );
}
