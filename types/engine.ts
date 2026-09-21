/**
 * AFIE Pre-Settlement Decision Engine — contract definitions.
 * Feature A: synchronous evaluate pipeline types.
 */

export type FinancialSector =
  | "MFI_CREDIT"
  | "B2B_REMITTANCE"
  | "SME_COMMERCE"
  | "INSTANT_BANKING_MOMO";

export type PaymentRail =
  | "MTN_MOMO"
  | "TELECEL_CASH"
  | "AIRTELTIGO_MONEY"
  | "GHIPSS_GIP"
  | "NIBSS_NIP"
  | "CARD_ACQUIRER";

export type EngineDecision = "HALT" | "STEP_UP_CHALLENGE" | "APPROVE";

export type RegulatoryAction =
  | "NONE"
  | "SAR_GENERATION_REQUIRED"
  | "AUDIT_LOG_FLAG";

export interface EvaluationPayload {
  tenantId: string;
  transactionId: string;
  sector: FinancialSector;
  rail: PaymentRail;
  amount: number;
  currency: string;
  sender: {
    accountId: string;
    identityHash: string;
    ipAddress: string;
    deviceFingerprint?: string;
  };
  beneficiary: {
    accountId: string;
    accountHash: string;
    accountAgeDays: number;
  };
  contextSignals?: {
    simSwapDetected?: boolean;
    simSwapAgeHours?: number;
    crossLenderVelocityCount?: number;
    staffApproverId?: string;
    staffApproverIp?: string;
    isTorOrVpn?: boolean;
    cardTestingVelocity?: number;
  };
}

export interface RulePenalty {
  ruleCode: string;
  name: string;
  weight: number;
  evidence: string;
}

export interface EvaluationResponse {
  transactionId: string;
  decision: EngineDecision;
  riskScore: number;
  latencyMs: number;
  failOpenTriggered: boolean;
  triggers: RulePenalty[];
  explainability: {
    summary: string;
    breakdown: string[];
  };
  regulatoryAction: RegulatoryAction;
  evaluatedAt: string;
}
