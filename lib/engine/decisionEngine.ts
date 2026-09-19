/**
 * AFIE Multi-Sector Real-Time Decision Engine
 * Deterministic, zero-I/O inference for inline pre-settlement halting.
 */

export type Sector =
  | "MFI_CREDIT"
  | "B2B_REMITTANCE"
  | "SME_COMMERCE"
  | "INSTANT_BANKING_MOMO";

export type Channel = "WEB_APP" | "MOBILE_SDK" | "USSD" | "API_GATEWAY";

export type Decision = "HALT" | "STEP_UP_CHALLENGE" | "APPROVE";

export type RegulatoryAction =
  | "NONE"
  | "SAR_GENERATION_REQUIRED"
  | "AUDIT_FLAG";

export interface TransactionPayload {
  tenantId: string;
  sector: Sector;
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  channel: Channel;
  deviceTelemetry?: {
    fingerprintHash: string;
    ipAddress: string;
    isVpnOrProxy: boolean;
    deviceAgeDays: number;
  };
  telecomSignals?: {
    simSwapDetected: boolean;
    simSwapHoursAgo?: number;
  };
  consortiumSignals?: {
    entityBlacklistedAcrossTenants: boolean;
    crossLenderActiveApplications24h: number;
  };
  insiderAudit?: {
    approverStaffId?: string;
    approverIpMatchBeneficiary: boolean;
  };
}

export interface TriggeredRule {
  code: string;
  description: string;
  weight: number;
  evidence: string;
}

export interface DecisionResult {
  decision: Decision;
  riskScore: number;
  latencyMs: number;
  deterministicRulesTriggered: TriggeredRule[];
  regulatoryAction: RegulatoryAction;
}

const UNDER_HALT_FLOOR = 1_000;
const HALT_THRESHOLD = 0.75;
const CHALLENGE_THRESHOLD = 0.4;

type RuleFn = (payload: TransactionPayload) => TriggeredRule | null;

const GLOBAL_RULES: RuleFn[] = [
  (p) => {
    if (!p.consortiumSignals?.entityBlacklistedAcrossTenants) return null;
    return {
      code: "CONSORTIUM_ENTITY_BLACKLIST",
      description: "Entity hash matched cross-tenant blacklist",
      weight: 0.55,
      evidence: `tenant=${p.tenantId} account=${p.accountId}`,
    };
  },
  (p) => {
    const tel = p.telecomSignals;
    if (!tel?.simSwapDetected) return null;
    const hours = tel.simSwapHoursAgo ?? 999;
    const weight = hours <= 24 ? 0.5 : hours <= 72 ? 0.35 : 0.2;
    return {
      code: "SIM_SWAP_SIGNAL",
      description: "Recent SIM-swap indicated on MSISDN",
      weight,
      evidence: `sim_swap_hours_ago=${hours}`,
    };
  },
  (p) => {
    const dev = p.deviceTelemetry;
    if (!dev?.isVpnOrProxy) return null;
    if (p.amount < 500) return null;
    return {
      code: "VPN_PROXY_HIGH_VALUE",
      description: "VPN/proxy egress on elevated-value transfer",
      weight: p.amount >= 2_500 ? 0.28 : 0.18,
      evidence: `ip=${dev.ipAddress} amount=${p.amount}`,
    };
  },
  (p) => {
    const age = p.deviceTelemetry?.deviceAgeDays;
    if (age === undefined || age > 3) return null;
    if (p.amount < 750) return null;
    return {
      code: "NEW_DEVICE_HIGH_VALUE",
      description: "Immature device fingerprint on high-value payout",
      weight: age === 0 ? 0.32 : 0.22,
      evidence: `device_age_days=${age}`,
    };
  },
];

const SECTOR_RULES: Record<Sector, RuleFn[]> = {
  MFI_CREDIT: [
    (p) => {
      const apps = p.consortiumSignals?.crossLenderActiveApplications24h ?? 0;
      if (apps < 3) return null;
      return {
        code: "LOAN_STACKING_SYNDICATE",
        description: "Multi-lender applications within 24h (loan stacking)",
        weight: apps >= 5 ? 0.5 : 0.38,
        evidence: `cross_lender_apps_24h=${apps}`,
      };
    },
    (p) => {
      if (!p.insiderAudit?.approverIpMatchBeneficiary) return null;
      return {
        code: "INSIDER_GHOST_LOAN",
        description: "Approver IP collocated with beneficiary payout path",
        weight: 0.6,
        evidence: `staff=${p.insiderAudit.approverStaffId ?? "unknown"}`,
      };
    },
    (p) => {
      if (p.channel !== "USSD" || p.amount < 1_500) return null;
      const apps = p.consortiumSignals?.crossLenderActiveApplications24h ?? 0;
      if (apps < 2) return null;
      return {
        code: "USSD_STACKING_CORRIDOR",
        description: "USSD disbursement with multi-lender pressure",
        weight: 0.25,
        evidence: `channel=USSD apps=${apps}`,
      };
    },
  ],
  B2B_REMITTANCE: [
    (p) => {
      if (p.amount < 5_000) return null;
      const blacklisted =
        p.consortiumSignals?.entityBlacklistedAcrossTenants === true;
      const vpn = p.deviceTelemetry?.isVpnOrProxy === true;
      if (!blacklisted && !vpn) return null;
      return {
        code: "MULE_DISBURSEMENT_CORRIDOR",
        description: "High-value remittance with mule / proxy indicators",
        weight: blacklisted ? 0.48 : 0.3,
        evidence: `amount=${p.amount} ${p.currency}`,
      };
    },
    (p) => {
      if (p.amount < 10_000) return null;
      const age = p.deviceTelemetry?.deviceAgeDays ?? 999;
      if (age > 1) return null;
      return {
        code: "INVOICE_HIJACK_PATTERN",
        description: "Large B2B payout from brand-new device session",
        weight: 0.42,
        evidence: `device_age_days=${age}`,
      };
    },
    (p) => {
      const apps = p.consortiumSignals?.crossLenderActiveApplications24h ?? 0;
      if (apps < 4) return null;
      return {
        code: "REMIT_VELOCITY_SPIKE",
        description: "Abnormal cross-corridor application velocity",
        weight: 0.33,
        evidence: `cross_corridor_apps_24h=${apps}`,
      };
    },
  ],
  SME_COMMERCE: [
    (p) => {
      // Card-testing signature: sub-$25 auth probes on new/spoofed devices
      if (p.amount <= 0 || p.amount > 25) return null;
      const age = p.deviceTelemetry?.deviceAgeDays ?? 999;
      if (age > 2 && !p.deviceTelemetry?.isVpnOrProxy) return null;
      return {
        code: "CARD_TESTING_PROBE",
        description: "Micro-authorization consistent with card testing",
        weight: 0.36,
        evidence: `amount=${p.amount} device_age_days=${age}`,
      };
    },
    (p) => {
      if (!p.consortiumSignals?.entityBlacklistedAcrossTenants) return null;
      if (p.amount < 100) return null;
      return {
        code: "CHARGEBACK_RING_ENTITY",
        description: "Beneficiary linked to chargeback / fraud ring graph",
        weight: 0.44,
        evidence: `account=${p.accountId}`,
      };
    },
    (p) => {
      const age = p.deviceTelemetry?.deviceAgeDays;
      if (age === undefined || age > 0) return null;
      if (!p.deviceTelemetry?.isVpnOrProxy) return null;
      return {
        code: "DEVICE_SPOOF_STACK",
        description: "Zero-age fingerprint behind VPN/proxy",
        weight: 0.3,
        evidence: `fp=${p.deviceTelemetry.fingerprintHash.slice(0, 12)}…`,
      };
    },
  ],
  INSTANT_BANKING_MOMO: [
    (p) => {
      const tel = p.telecomSignals;
      if (!tel?.simSwapDetected) return null;
      const hours = tel.simSwapHoursAgo ?? 999;
      if (hours > 48) return null;
      return {
        code: "MOMO_SIM_SWAP_CASHOUT",
        description: "SIM-swap proximal to MoMo / instant cash-out",
        weight: hours <= 6 ? 0.58 : 0.4,
        evidence: `sim_swap_hours_ago=${hours} channel=${p.channel}`,
      };
    },
    (p) => {
      if (p.amount < 2_000) return null;
      const age = p.deviceTelemetry?.deviceAgeDays ?? 999;
      if (age > 1) return null;
      return {
        code: "FAST_CASHOUT_DRAIN",
        description: "Elevated instant payout from immature device",
        weight: 0.34,
        evidence: `amount=${p.amount} device_age_days=${age}`,
      };
    },
    (p) => {
      const apps = p.consortiumSignals?.crossLenderActiveApplications24h ?? 0;
      if (apps < 3 || p.amount < 1_000) return null;
      return {
        code: "INSTANT_RAIL_MULE_BURST",
        description: "Burst activity across instant rails / wallets",
        weight: 0.37,
        evidence: `apps_24h=${apps}`,
      };
    },
  ],
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function scoreToDecision(score: number, amount: number): Decision {
  if (score >= HALT_THRESHOLD) {
    if (amount < UNDER_HALT_FLOOR) return "STEP_UP_CHALLENGE";
    return "HALT";
  }
  if (score >= CHALLENGE_THRESHOLD) return "STEP_UP_CHALLENGE";
  if (score >= 0.2) return "STEP_UP_CHALLENGE";
  return "APPROVE";
}

function regulatoryFor(
  decision: Decision,
  rules: TriggeredRule[],
): RegulatoryAction {
  const sarCodes = new Set([
    "INSIDER_GHOST_LOAN",
    "CONSORTIUM_ENTITY_BLACKLIST",
    "LOAN_STACKING_SYNDICATE",
    "MULE_DISBURSEMENT_CORRIDOR",
    "MOMO_SIM_SWAP_CASHOUT",
    "CHARGEBACK_RING_ENTITY",
  ]);
  if (decision === "HALT" && rules.some((r) => sarCodes.has(r.code))) {
    return "SAR_GENERATION_REQUIRED";
  }
  if (decision === "HALT" || decision === "STEP_UP_CHALLENGE") {
    return "AUDIT_FLAG";
  }
  return "NONE";
}

/**
 * Synchronous multi-sector evaluate. No network I/O — suitable for <40ms inline path.
 */
export function evaluateDecision(payload: TransactionPayload): DecisionResult {
  const start = performance.now();

  const rules: TriggeredRule[] = [];
  for (const rule of GLOBAL_RULES) {
    const hit = rule(payload);
    if (hit) rules.push(hit);
  }
  for (const rule of SECTOR_RULES[payload.sector]) {
    const hit = rule(payload);
    if (hit) rules.push(hit);
  }

  // Soft channel uplift: API gateway without device telemetry on high value
  if (
    payload.channel === "API_GATEWAY" &&
    !payload.deviceTelemetry &&
    payload.amount >= 3_000
  ) {
    rules.push({
      code: "OPAQUE_API_GATEWAY_PAYOUT",
      description: "High-value API payout without device telemetry",
      weight: 0.15,
      evidence: `amount=${payload.amount}`,
    });
  }

  const rawScore = rules.reduce((sum, r) => sum + r.weight, 0);
  let riskScore = clamp01(rawScore);

  let decision = scoreToDecision(riskScore, payload.amount);

  // Enforce under-$1k floor even if raw score would halt
  if (payload.amount < UNDER_HALT_FLOOR && decision === "HALT") {
    decision = "STEP_UP_CHALLENGE";
    riskScore = Math.min(riskScore, 0.69);
    rules.push({
      code: "UNDER_1K_HALT_FLOOR",
      description: "Amount under $1,000 — auto-halt suppressed; step-up required",
      weight: 0,
      evidence: `amount=${payload.amount}`,
    });
  }

  // Clean approve if nothing meaningful fired
  if (rules.filter((r) => r.weight > 0).length === 0) {
    decision = "APPROVE";
    riskScore = 0;
  }

  const latencyMs = Math.max(1, Math.round(performance.now() - start));

  return {
    decision,
    riskScore: Number(riskScore.toFixed(2)),
    latencyMs,
    deterministicRulesTriggered: rules,
    regulatoryAction: regulatoryFor(decision, rules),
  };
}

/** Map legacy fraud-engine actions for UI compatibility. */
export function decisionToLegacyAction(
  decision: Decision,
): "ALLOW" | "CHALLENGE" | "BLOCK" {
  if (decision === "HALT") return "BLOCK";
  if (decision === "STEP_UP_CHALLENGE") return "CHALLENGE";
  return "ALLOW";
}
