/**
 * Resilient pre-settlement evaluator with 38ms SLA watchdog + fail-open.
 */

import { runDecisionPipeline } from "@/lib/engine/decisionPipeline";
import type { EvaluationPayload, EvaluationResponse } from "@/types/engine";

export const SLA_TIMEOUT_MS = 38;

export interface EvaluatorOptions {
  /** Test harness only — forces artificial delay to exercise fail-open. */
  artificialDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function failOpenResponse(
  payload: EvaluationPayload,
  latencyMs: number,
): EvaluationResponse {
  return {
    transactionId: payload.transactionId,
    decision: "APPROVE",
    riskScore: 0,
    latencyMs,
    failOpenTriggered: true,
    triggers: [
      {
        ruleCode: "SAFEGUARD_FAIL_OPEN",
        name: "38ms SLA watchdog",
        weight: 0,
        evidence:
          "Engine exceeded 38ms SLA. Cleared inline to prevent transaction drop.",
      },
    ],
    explainability: {
      summary:
        "Fail-open safeguard engaged — payment cleared to protect settlement rails.",
      breakdown: [
        "SAFEGUARD_FAIL_OPEN: Engine exceeded 38ms SLA. Cleared inline to prevent transaction drop.",
      ],
    },
    regulatoryAction: "AUDIT_LOG_FLAG",
    evaluatedAt: new Date().toISOString(),
  };
}

async function executeDeterministic(
  payload: EvaluationPayload,
  artificialDelayMs?: number,
): Promise<Omit<EvaluationResponse, "latencyMs">> {
  if (artificialDelayMs && artificialDelayMs > 0) {
    await sleep(artificialDelayMs);
  }

  const result = runDecisionPipeline(payload);

  return {
    transactionId: payload.transactionId,
    decision: result.decision,
    riskScore: result.riskScore,
    failOpenTriggered: false,
    triggers: result.triggers,
    explainability: result.explainability,
    regulatoryAction: result.regulatoryAction,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Process a pre-settlement evaluation under a hard 38ms Promise.race watchdog.
 * Timeout or stall → APPROVE + failOpenTriggered (never lock partner rails).
 */
export async function processPreSettlementEvaluation(
  payload: EvaluationPayload,
  options: EvaluatorOptions = {},
): Promise<EvaluationResponse> {
  const start = performance.now();

  const evaluationPromise = executeDeterministic(
    payload,
    options.artificialDelayMs,
  ).then((body) => {
    const latencyMs = Math.max(0, Math.round(performance.now() - start));
    return { ...body, latencyMs } satisfies EvaluationResponse;
  });

  const timeoutPromise = new Promise<EvaluationResponse>((resolve) => {
    setTimeout(() => {
      const latencyMs = Math.max(
        SLA_TIMEOUT_MS,
        Math.round(performance.now() - start),
      );
      resolve(failOpenResponse(payload, latencyMs));
    }, SLA_TIMEOUT_MS);
  });

  return Promise.race([evaluationPromise, timeoutPromise]);
}
