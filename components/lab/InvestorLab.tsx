"use client";

import { useCallback, useMemo, useState } from "react";
import {
  evaluateDecision,
  type DecisionResult,
  type Sector,
  type TransactionPayload,
} from "@/lib/engine/decisionEngine";
import { SiteShell } from "@/components/site/SiteShell";

const SECTORS: { id: Sector; label: string; blurb: string }[] = [
  {
    id: "MFI_CREDIT",
    label: "MFI / Credit Union",
    blurb: "Ghost loans · loan stacking · insider collusion",
  },
  {
    id: "B2B_REMITTANCE",
    label: "B2B Remittance",
    blurb: "Mule disbursement · invoice hijack · velocity",
  },
  {
    id: "SME_COMMERCE",
    label: "SME Commerce",
    blurb: "Card testing · chargeback rings · device spoof",
  },
  {
    id: "INSTANT_BANKING_MOMO",
    label: "MoMo / Instant Rails",
    blurb: "SIM-swap cash-out · fast drains",
  },
];

type Scenario = {
  id: string;
  title: string;
  expect: "HALT" | "STEP_UP_CHALLENGE" | "APPROVE";
  payload: TransactionPayload;
};

function scenariosFor(sector: Sector): Scenario[] {
  const base = {
    tenantId: "tenant_demo_001",
    sector,
    transactionId: `lab_${Date.now()}`,
    accountId: "acc_demo_8841",
    currency: sector === "SME_COMMERCE" ? "USD" : "GHS",
    channel: "MOBILE_SDK" as const,
  };

  if (sector === "MFI_CREDIT") {
    return [
      {
        id: "mfi-insider",
        title: "Insider ghost loan",
        expect: "HALT",
        payload: {
          ...base,
          amount: 4_500,
          channel: "API_GATEWAY",
          consortiumSignals: {
            entityBlacklistedAcrossTenants: false,
            crossLenderActiveApplications24h: 1,
          },
          insiderAudit: {
            approverStaffId: "lo_204",
            approverIpMatchBeneficiary: true,
          },
        },
      },
      {
        id: "mfi-stack",
        title: "Loan stacking syndicate",
        expect: "HALT",
        payload: {
          ...base,
          amount: 2_800,
          channel: "USSD",
          consortiumSignals: {
            entityBlacklistedAcrossTenants: false,
            crossLenderActiveApplications24h: 5,
          },
        },
      },
      {
        id: "mfi-clean",
        title: "Clean disbursement",
        expect: "APPROVE",
        payload: {
          ...base,
          amount: 650,
          deviceTelemetry: {
            fingerprintHash: "fp_stable_91",
            ipAddress: "102.176.10.4",
            isVpnOrProxy: false,
            deviceAgeDays: 120,
          },
        },
      },
    ];
  }

  if (sector === "B2B_REMITTANCE") {
    return [
      {
        id: "b2b-mule",
        title: "Mule disbursement corridor",
        expect: "HALT",
        payload: {
          ...base,
          amount: 18_000,
          consortiumSignals: {
            entityBlacklistedAcrossTenants: true,
            crossLenderActiveApplications24h: 2,
          },
          deviceTelemetry: {
            fingerprintHash: "fp_vpn_01",
            ipAddress: "185.220.101.2",
            isVpnOrProxy: true,
            deviceAgeDays: 4,
          },
        },
      },
      {
        id: "b2b-hijack",
        title: "Invoice hijack (new device)",
        expect: "HALT",
        payload: {
          ...base,
          amount: 22_500,
          deviceTelemetry: {
            fingerprintHash: "fp_new_00",
            ipAddress: "41.66.90.1",
            isVpnOrProxy: false,
            deviceAgeDays: 0,
          },
        },
      },
      {
        id: "b2b-ok",
        title: "Known corporate payout",
        expect: "APPROVE",
        payload: {
          ...base,
          amount: 3_200,
          deviceTelemetry: {
            fingerprintHash: "fp_corp_12",
            ipAddress: "197.255.1.9",
            isVpnOrProxy: false,
            deviceAgeDays: 400,
          },
        },
      },
    ];
  }

  if (sector === "SME_COMMERCE") {
    return [
      {
        id: "sme-test",
        title: "Card testing probe",
        expect: "STEP_UP_CHALLENGE",
        payload: {
          ...base,
          amount: 1.19,
          currency: "USD",
          deviceTelemetry: {
            fingerprintHash: "fp_probe",
            ipAddress: "8.8.8.8",
            isVpnOrProxy: true,
            deviceAgeDays: 0,
          },
        },
      },
      {
        id: "sme-ring",
        title: "Chargeback ring entity",
        expect: "HALT",
        payload: {
          ...base,
          amount: 890,
          currency: "USD",
          consortiumSignals: {
            entityBlacklistedAcrossTenants: true,
            crossLenderActiveApplications24h: 0,
          },
        },
      },
      {
        id: "sme-ok",
        title: "Returning customer checkout",
        expect: "APPROVE",
        payload: {
          ...base,
          amount: 84.5,
          currency: "USD",
          deviceTelemetry: {
            fingerprintHash: "fp_loyal",
            ipAddress: "154.160.1.2",
            isVpnOrProxy: false,
            deviceAgeDays: 200,
          },
        },
      },
    ];
  }

  // INSTANT_BANKING_MOMO
  return [
    {
      id: "momo-swap",
      title: "SIM-swap cash-out",
      expect: "HALT",
      payload: {
        ...base,
        amount: 2_500,
        channel: "USSD",
        telecomSignals: { simSwapDetected: true, simSwapHoursAgo: 3 },
        deviceTelemetry: {
          fingerprintHash: "fp_momo",
          ipAddress: "102.176.55.9",
          isVpnOrProxy: false,
          deviceAgeDays: 40,
        },
      },
    },
    {
      id: "momo-drain",
      title: "Fast cash-out drain",
      expect: "STEP_UP_CHALLENGE",
      payload: {
        ...base,
        amount: 3_100,
        deviceTelemetry: {
          fingerprintHash: "fp_new_momo",
          ipAddress: "102.176.55.9",
          isVpnOrProxy: false,
          deviceAgeDays: 0,
        },
      },
    },
    {
      id: "momo-ok",
      title: "Routine MoMo send",
      expect: "APPROVE",
      payload: {
        ...base,
        amount: 120,
        telecomSignals: { simSwapDetected: false },
        deviceTelemetry: {
          fingerprintHash: "fp_momo_ok",
          ipAddress: "102.176.12.1",
          isVpnOrProxy: false,
          deviceAgeDays: 90,
        },
      },
    },
  ];
}

const DECISION_STYLE = {
  HALT: "border-red-500/20 bg-red-500/10 text-red-400",
  STEP_UP_CHALLENGE: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  APPROVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
} as const;

export function InvestorLabClient() {
  const [sector, setSector] = useState<Sector>("MFI_CREDIT");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [lastScenario, setLastScenario] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scenarios = useMemo(() => scenariosFor(sector), [sector]);

  const run = useCallback(async (scenario: Scenario) => {
    setBusy(true);
    setLastScenario(scenario.id);
    // Prefer live API so latency includes route overhead; fall back to local.
    try {
      const payload = {
        ...scenario.payload,
        transactionId: `lab_${Date.now()}`,
      };
      const res = await fetch("/api/v1/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as DecisionResult & {
          transactionId?: string;
        };
        setResult(data);
        setBusy(false);
        return;
      }
      setResult(evaluateDecision(payload));
    } catch {
      setResult(evaluateDecision(scenario.payload));
    }
    setBusy(false);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="font-mono text-[11px] text-[#8B95A8]">INVESTOR EVALUATION LAB</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Multi-sector decision engine
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
        Fire deterministic scenarios across MFI, remittance, SME commerce, and
        MoMo rails. Inline verdicts with reason codes — no post-settlement lag.
      </p>

      <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SECTORS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSector(s.id);
              setResult(null);
              setLastScenario(null);
            }}
            className={`rounded-lg border p-4 text-left transition ${
              sector === s.id
                ? "border-emerald-500/35 bg-emerald-500/10"
                : "border-white/[0.06] bg-[#0B0F17] hover:border-white/[0.12]"
            }`}
          >
            <p className="text-sm font-semibold text-white">{s.label}</p>
            <p className="mt-1 text-xs text-[#8B95A8]">{s.blurb}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Scenarios
          </p>
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={busy}
              onClick={() => void run(sc)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                lastScenario === sc.id
                  ? "border-white/[0.14] bg-[#111827]"
                  : "border-white/[0.06] bg-[#0B0F17] hover:border-white/[0.12]"
              }`}
            >
              <span>
                <span className="block text-sm text-white">{sc.title}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-[#5C6678]">
                  expect {sc.expect}
                </span>
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                Evaluate →
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#0B0F17] p-5">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Decision output
          </p>
          {!result ? (
            <p className="mt-6 text-sm text-[#5C6678]">
              Select a scenario to run the deterministic engine.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded border px-2.5 py-1 font-mono text-xs font-semibold ${DECISION_STYLE[result.decision]}`}
                >
                  {result.decision}
                </span>
                <span className="font-mono text-sm tabular-nums text-white">
                  risk {result.riskScore.toFixed(2)}
                </span>
                <span className="font-mono text-xs tabular-nums text-[#8B95A8]">
                  {result.latencyMs}ms
                </span>
                <span className="font-mono text-[10px] text-[#5C6678]">
                  {result.regulatoryAction}
                </span>
              </div>

              <ul className="space-y-2">
                {result.deterministicRulesTriggered.length === 0 ? (
                  <li className="font-mono text-xs text-emerald-400">
                    No rules triggered
                  </li>
                ) : (
                  result.deterministicRulesTriggered.map((rule) => (
                    <li
                      key={`${rule.code}-${rule.evidence}`}
                      className="rounded border border-white/[0.06] bg-[#06080D] px-3 py-2"
                    >
                      <div className="flex justify-between gap-2 font-mono text-[11px]">
                        <span className="text-amber-400">{rule.code}</span>
                        <span className="tabular-nums text-slate-400">
                          +{rule.weight.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#8B95A8]">
                        {rule.description}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[#5C6678]">
                        {rule.evidence}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InvestorLabPage() {
  return (
    <SiteShell>
      <InvestorLabClient />
    </SiteShell>
  );
}
