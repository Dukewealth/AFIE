import type { FraudAction, TransactionPayload } from "@/lib/fraud-engine/types";
import type {
  EngineDecision,
  EvaluationPayload,
  EvaluationResponse,
  FinancialSector,
  PaymentRail,
} from "@/types/engine";

/** Map Feature A decisions onto the legacy fraud-engine action vocabulary. */
export function engineDecisionToLegacyAction(
  decision: EngineDecision,
): FraudAction {
  if (decision === "HALT") return "BLOCK";
  if (decision === "STEP_UP_CHALLENGE") return "CHALLENGE";
  return "ALLOW";
}

function railFromPaymentMethod(
  method: TransactionPayload["payment_method"],
): PaymentRail {
  if (method === "momo") return "MTN_MOMO";
  if (method === "bank_transfer") return "GHIPSS_GIP";
  return "CARD_ACQUIRER";
}

function sectorFromPaymentMethod(
  method: TransactionPayload["payment_method"],
): FinancialSector {
  if (method === "momo") return "INSTANT_BANKING_MOMO";
  if (method === "bank_transfer") return "B2B_REMITTANCE";
  return "SME_COMMERCE";
}

/**
 * Bridge legacy merchant payloads into the Feature A EvaluationPayload contract
 * so the live simulator and older connectors keep working.
 */
export function legacyPayloadToEvaluation(
  legacy: TransactionPayload,
  tenantId: string,
): EvaluationPayload {
  const meta = legacy.metadata ?? {};
  const accountAgeDays =
    typeof meta.account_age_days === "number" ? meta.account_age_days : 90;
  const simSwapDetected = meta.sim_swap_detected === true;
  const simSwapAgeHours =
    typeof meta.sim_swap_age_hours === "number"
      ? meta.sim_swap_age_hours
      : undefined;
  const crossLenderVelocityCount =
    typeof meta.cross_lender_velocity_count === "number"
      ? meta.cross_lender_velocity_count
      : undefined;
  const cardTestingVelocity =
    typeof meta.card_testing_velocity === "number"
      ? meta.card_testing_velocity
      : undefined;
  const isTorOrVpn = meta.is_tor_or_vpn === true;
  const staffApproverIp =
    typeof meta.staff_approver_ip === "string"
      ? meta.staff_approver_ip
      : undefined;
  const staffApproverId =
    typeof meta.staff_approver_id === "string"
      ? meta.staff_approver_id
      : undefined;

  return {
    tenantId,
    transactionId: legacy.transaction_id,
    sector: sectorFromPaymentMethod(legacy.payment_method),
    rail: railFromPaymentMethod(legacy.payment_method),
    amount: legacy.amount,
    currency: legacy.currency,
    sender: {
      accountId: legacy.user_id,
      identityHash: `idhash_${legacy.user_id}`,
      ipAddress: legacy.ip_address,
      deviceFingerprint: legacy.device_fingerprint,
    },
    beneficiary: {
      accountId: `ben_${legacy.user_id}`,
      accountHash: `benhash_${legacy.device_fingerprint}`,
      accountAgeDays,
    },
    contextSignals: {
      simSwapDetected,
      simSwapAgeHours,
      crossLenderVelocityCount,
      cardTestingVelocity,
      isTorOrVpn,
      staffApproverIp,
      staffApproverId,
    },
  };
}

export function evaluationToLegacyResponse(result: EvaluationResponse) {
  return {
    transaction_id: result.transactionId,
    action: engineDecisionToLegacyAction(result.decision),
    risk_score: Math.round(result.riskScore * 100),
    reasons: [
      result.explainability.summary,
      ...result.explainability.breakdown,
    ],
    latency_ms: result.latencyMs,
    timestamp: result.evaluatedAt,
    // Feature A fields retained for modern clients
    decision: result.decision,
    riskScore: result.riskScore,
    failOpenTriggered: result.failOpenTriggered,
    triggers: result.triggers,
    explainability: result.explainability,
    regulatoryAction: result.regulatoryAction,
  };
}
