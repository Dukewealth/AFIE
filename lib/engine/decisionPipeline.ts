/**
 * Deterministic multi-sector rule matrix & risk score synthesis.
 * RiskScore = min(1.0, Σ (w_i × p_i)) where p_i ∈ {0,1} for triggered rules.
 */

import type {
  EngineDecision,
  EvaluationPayload,
  RegulatoryAction,
  RulePenalty,
} from "@/types/engine";

export const HALT_THRESHOLD = 0.75;
export const CHALLENGE_THRESHOLD = 0.35;
export const HIGH_VALUE_PROXY_AMOUNT = 1_000;

export interface PipelineResult {
  riskScore: number;
  decision: EngineDecision;
  triggers: RulePenalty[];
  regulatoryAction: RegulatoryAction;
  explainability: {
    summary: string;
    breakdown: string[];
  };
}

type RuleFn = (payload: EvaluationPayload) => RulePenalty | null;

/** RULE_TELCO_SIM_SWAP */
const ruleTelcoSimSwap: RuleFn = (p) => {
  const signals = p.contextSignals;
  if (!signals?.simSwapDetected) return null;
  const hours = signals.simSwapAgeHours ?? 999;
  if (hours > 24) return null;
  const weight = hours <= 6 ? 0.45 : 0.3;
  return {
    ruleCode: "RULE_TELCO_SIM_SWAP",
    name: "Telco SIM-swap proximity",
    weight,
    evidence: `sim_swap_age_hours=${hours} rail=${p.rail}`,
  };
};

/** RULE_CONSORTIUM_STACKING — ≥3 cross-lender hits (15m window signal) */
const ruleConsortiumStacking: RuleFn = (p) => {
  const count = p.contextSignals?.crossLenderVelocityCount ?? 0;
  if (count < 3) return null;
  return {
    ruleCode: "RULE_CONSORTIUM_STACKING",
    name: "Cross-lender velocity stacking",
    weight: 0.4,
    evidence: `cross_lender_velocity_count=${count} window=15m`,
  };
};

/** RULE_INSIDER_COLLUSION — staff approver IP matches sender */
const ruleInsiderCollusion: RuleFn = (p) => {
  const staffIp = p.contextSignals?.staffApproverIp;
  if (!staffIp) return null;
  if (staffIp !== p.sender.ipAddress) return null;
  return {
    ruleCode: "RULE_INSIDER_COLLUSION",
    name: "Insider approver IP collocation",
    weight: 0.45,
    evidence: `staff=${p.contextSignals?.staffApproverId ?? "unknown"} ip=${staffIp}`,
  };
};

/** RULE_BURNER_DESTINATION — young beneficiary + elevated amount */
const ruleBurnerDestination: RuleFn = (p) => {
  if (p.beneficiary.accountAgeDays > 2) return null;
  if (p.amount <= 2_500) return null;
  return {
    ruleCode: "RULE_BURNER_DESTINATION",
    name: "Burner beneficiary destination",
    weight: 0.25,
    evidence: `account_age_days=${p.beneficiary.accountAgeDays} amount=${p.amount}`,
  };
};

/** RULE_CARD_TESTING_BURST */
const ruleCardTestingBurst: RuleFn = (p) => {
  const velocity = p.contextSignals?.cardTestingVelocity ?? 0;
  if (velocity < 5) return null;
  return {
    ruleCode: "RULE_CARD_TESTING_BURST",
    name: "Card testing burst velocity",
    weight: 0.35,
    evidence: `card_testing_velocity=${velocity} rail=${p.rail}`,
  };
};

/** RULE_ANONYMIZED_PROXY — Tor/VPN on high-value transfer */
const ruleAnonymizedProxy: RuleFn = (p) => {
  if (!p.contextSignals?.isTorOrVpn) return null;
  if (p.amount < HIGH_VALUE_PROXY_AMOUNT) return null;
  return {
    ruleCode: "RULE_ANONYMIZED_PROXY",
    name: "Anonymized proxy on high-value payout",
    weight: 0.2,
    evidence: `is_tor_or_vpn=true amount=${p.amount}`,
  };
};

const RULE_MATRIX: RuleFn[] = [
  ruleTelcoSimSwap,
  ruleConsortiumStacking,
  ruleInsiderCollusion,
  ruleBurnerDestination,
  ruleCardTestingBurst,
  ruleAnonymizedProxy,
];

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function decisionFromScore(score: number): EngineDecision {
  if (score >= HALT_THRESHOLD) return "HALT";
  if (score >= CHALLENGE_THRESHOLD) return "STEP_UP_CHALLENGE";
  return "APPROVE";
}

function regulatoryFromDecision(decision: EngineDecision): RegulatoryAction {
  if (decision === "HALT") return "SAR_GENERATION_REQUIRED";
  if (decision === "STEP_UP_CHALLENGE") return "AUDIT_LOG_FLAG";
  return "NONE";
}

/**
 * Synchronous in-memory evaluation — no I/O, no network hops.
 */
export function runDecisionPipeline(payload: EvaluationPayload): PipelineResult {
  const triggers: RulePenalty[] = [];

  for (const rule of RULE_MATRIX) {
    const hit = rule(payload);
    if (hit) triggers.push(hit);
  }

  const raw = triggers.reduce((sum, t) => sum + t.weight, 0);
  const riskScore = Number(clamp01(raw).toFixed(4));
  const decision = decisionFromScore(riskScore);
  const regulatoryAction = regulatoryFromDecision(decision);

  const breakdown = triggers.map(
    (t) => `${t.ruleCode} (+${t.weight.toFixed(2)}): ${t.evidence}`,
  );

  const summary =
    triggers.length === 0
      ? "No deterministic penalties triggered — cleared for settlement."
      : `Triggered ${triggers.length} rule(s); riskScore=${riskScore.toFixed(2)} → ${decision}.`;

  return {
    riskScore,
    decision,
    triggers,
    regulatoryAction,
    explainability: { summary, breakdown },
  };
}
