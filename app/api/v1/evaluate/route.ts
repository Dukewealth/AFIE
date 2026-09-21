import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  MerchantAuthError,
  validateMerchantApiKey,
} from "@/lib/auth/merchant";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { EvaluationPayloadSchema } from "@/lib/engine/evaluationSchema";
import { processPreSettlementEvaluation } from "@/lib/engine/evaluatorService";
import {
  evaluationToLegacyResponse,
  engineDecisionToLegacyAction,
  legacyPayloadToEvaluation,
} from "@/lib/engine/legacyBridge";
import {
  TransactionPayloadSchema,
  type TransactionPayload,
} from "@/lib/fraud-engine/types";
import { recordLocalEvaluation } from "@/lib/store/local";
import type { EvaluationPayload, EvaluationResponse } from "@/types/engine";
import { ZodError } from "zod";

export const runtime = "nodejs";

function responseHeaders(result: EvaluationResponse): HeadersInit {
  return {
    "X-AFIE-Latency-Ms": String(result.latencyMs),
    "X-AFIE-Decision": result.decision,
    "Cache-Control": "no-store, no-cache",
  };
}

function failOpenEnvelope(
  transactionId: string,
  latencyMs: number,
): EvaluationResponse {
  return {
    transactionId,
    decision: "APPROVE",
    riskScore: 0,
    latencyMs,
    failOpenTriggered: true,
    triggers: [
      {
        ruleCode: "SAFEGUARD_FAIL_OPEN",
        name: "Unhandled exception safeguard",
        weight: 0,
        evidence:
          "Engine exceeded 38ms SLA. Cleared inline to prevent transaction drop.",
      },
    ],
    explainability: {
      summary:
        "Unhandled evaluator fault — fail-open APPROVE to protect settlement rails.",
      breakdown: [
        "SAFEGUARD_FAIL_OPEN: Engine exceeded 38ms SLA. Cleared inline to prevent transaction drop.",
      ],
    },
    regulatoryAction: "AUDIT_LOG_FLAG",
    evaluatedAt: new Date().toISOString(),
  };
}

function persistSideEffect(
  payload: EvaluationPayload,
  result: EvaluationResponse,
  merchantId: string,
  legacy?: TransactionPayload,
): void {
  try {
    const action = engineDecisionToLegacyAction(result.decision);
    const bridgeLegacy: TransactionPayload = legacy ?? {
      transaction_id: payload.transactionId,
      user_id: payload.sender.accountId,
      amount: payload.amount > 0 ? payload.amount : 0.01,
      currency: payload.currency.length === 3 ? payload.currency : "GHS",
      payment_method:
        payload.rail === "CARD_ACQUIRER"
          ? "card"
          : payload.rail === "GHIPSS_GIP" || payload.rail === "NIBSS_NIP"
            ? "bank_transfer"
            : "momo",
      ip_address: payload.sender.ipAddress,
      device_fingerprint: payload.sender.deviceFingerprint ?? "fp_unknown",
      billing_country: "GH",
      metadata: {},
    };

    recordLocalEvaluation(
      bridgeLegacy,
      merchantId,
      {
        action,
        risk_score: Math.round(result.riskScore * 100),
        reasons: [
          result.explainability.summary,
          ...result.explainability.breakdown,
        ],
        latency_ms: result.latencyMs,
        timestamp: result.evaluatedAt,
      },
      {
        score: Math.round(result.riskScore * 100),
        triggeredRules: result.triggers.map((t) => t.ruleCode),
        status:
          result.decision === "HALT"
            ? "CRITICAL"
            : result.decision === "STEP_UP_CHALLENGE"
              ? "FLAGGED"
              : "CLEAR",
        action,
        reasons: result.explainability.breakdown,
        velocityStats: {
          userCount3m: 0,
          userCount1h: 0,
          deviceCount3m: 0,
          deviceCount1h: 0,
        },
      },
      null,
    );
  } catch (err) {
    console.error("[AFIE] Persist side-effect failed:", err);
  }
}

function isFeatureAPayload(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "tenantId" in body &&
    "transactionId" in body &&
    "sender" in body &&
    "beneficiary" in body
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const started = performance.now();
  let transactionId = "unknown";

  try {
    const apiKey = extractBearerToken(request.headers.get("authorization"));
    const merchant = await validateMerchantApiKey(apiKey);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Malformed JSON body", 400);
    }

    let payload: EvaluationPayload;
    let legacy: TransactionPayload | undefined;
    let respondLegacy = false;

    if (isFeatureAPayload(body)) {
      try {
        payload = EvaluationPayloadSchema.parse(body);
        transactionId = payload.transactionId;
      } catch (error) {
        if (error instanceof ZodError) {
          return jsonError(
            "Invalid request payload — missing or invalid parameters",
            400,
            error.flatten().fieldErrors,
          );
        }
        throw error;
      }
    } else {
      try {
        legacy = TransactionPayloadSchema.parse(body);
        transactionId = legacy.transaction_id;
        payload = legacyPayloadToEvaluation(legacy, merchant.id);
        respondLegacy = true;
      } catch (error) {
        if (error instanceof ZodError) {
          return jsonError(
            "Invalid request payload — missing or invalid parameters",
            400,
            error.flatten().fieldErrors,
          );
        }
        throw error;
      }
    }

    const result = await processPreSettlementEvaluation(payload);
    persistSideEffect(payload, result, merchant.id, legacy);

    if (respondLegacy) {
      return NextResponse.json(evaluationToLegacyResponse(result), {
        status: 200,
        headers: responseHeaders(result),
      });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: responseHeaders(result),
    });
  } catch (error) {
    if (error instanceof MerchantAuthError || error instanceof ZodError) {
      return handleRouteError(error);
    }

    console.error("[AFIE] Evaluate fail-open on exception:", error);
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const envelope = failOpenEnvelope(transactionId, latencyMs);
    return NextResponse.json(envelope, {
      status: 200,
      headers: responseHeaders(envelope),
    });
  }
}
