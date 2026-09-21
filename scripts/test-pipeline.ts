/**
 * Feature A — Pre-Settlement Decision Pipeline verification harness.
 *
 * Run: npx tsx scripts/test-pipeline.ts
 */

import {
  processPreSettlementEvaluation,
  SLA_TIMEOUT_MS,
} from "../lib/engine/evaluatorService";
import type { EvaluationPayload } from "../types/engine";

interface CaseResult {
  name: string;
  pass: boolean;
  detail: string;
}

function basePayload(
  overrides: Partial<EvaluationPayload> & {
    contextSignals?: EvaluationPayload["contextSignals"];
  },
): EvaluationPayload {
  return {
    tenantId: "tenant_test_001",
    transactionId: `tx_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sector: "INSTANT_BANKING_MOMO",
    rail: "MTN_MOMO",
    amount: 2_500,
    currency: "GHS",
    sender: {
      accountId: "acc_sender_01",
      identityHash: "idhash_sender_01",
      ipAddress: "102.176.45.12",
      deviceFingerprint: "fp_test_01",
    },
    beneficiary: {
      accountId: "acc_ben_01",
      accountHash: "benhash_01",
      accountAgeDays: 120,
    },
    ...overrides,
    contextSignals: {
      ...overrides.contextSignals,
    },
  };
}

async function runCases(): Promise<CaseResult[]> {
  const results: CaseResult[] = [];

  // 1. Syndicate MoMo Attack (SIM-Swap + Velocity) → HALT (<40ms)
  {
    const name = "Syndicate MoMo Attack → HALT";
    const payload = basePayload({
      sector: "INSTANT_BANKING_MOMO",
      rail: "MTN_MOMO",
      amount: 3_200,
      contextSignals: {
        simSwapDetected: true,
        simSwapAgeHours: 3,
        crossLenderVelocityCount: 4,
      },
    });
    // 0.45 + 0.40 = 0.85 ≥ 0.75 → HALT
    const out = await processPreSettlementEvaluation(payload);
    const pass =
      out.decision === "HALT" &&
      out.latencyMs < 40 &&
      out.failOpenTriggered === false &&
      out.regulatoryAction === "SAR_GENERATION_REQUIRED";
    results.push({
      name,
      pass,
      detail: `decision=${out.decision} score=${out.riskScore} latency=${out.latencyMs}ms failOpen=${out.failOpenTriggered}`,
    });
  }

  // 2. Cross-Lender Stacking Loan → STEP_UP_CHALLENGE
  {
    const name = "Cross-Lender Stacking → STEP_UP_CHALLENGE";
    const payload = basePayload({
      sector: "MFI_CREDIT",
      rail: "GHIPSS_GIP",
      amount: 1_800,
      contextSignals: {
        crossLenderVelocityCount: 3,
      },
    });
    // 0.40 alone → STEP_UP_CHALLENGE
    const out = await processPreSettlementEvaluation(payload);
    const pass =
      out.decision === "STEP_UP_CHALLENGE" &&
      out.failOpenTriggered === false &&
      out.triggers.some((t) => t.ruleCode === "RULE_CONSORTIUM_STACKING");
    results.push({
      name,
      pass,
      detail: `decision=${out.decision} score=${out.riskScore} triggers=${out.triggers.map((t) => t.ruleCode).join(",")}`,
    });
  }

  // 3. Clean Routine Transfer → APPROVE
  {
    const name = "Clean Routine Transfer → APPROVE";
    const payload = basePayload({
      sector: "SME_COMMERCE",
      rail: "CARD_ACQUIRER",
      amount: 84.5,
      beneficiary: {
        accountId: "acc_loyal",
        accountHash: "ben_loyal",
        accountAgeDays: 400,
      },
      contextSignals: {},
    });
    const out = await processPreSettlementEvaluation(payload);
    const pass =
      out.decision === "APPROVE" &&
      out.riskScore === 0 &&
      out.failOpenTriggered === false &&
      out.triggers.length === 0;
    results.push({
      name,
      pass,
      detail: `decision=${out.decision} score=${out.riskScore} triggers=${out.triggers.length}`,
    });
  }

  // 4. Artificial Latency Delay → failOpenTriggered + APPROVE
  {
    const name = `Artificial Latency (>${SLA_TIMEOUT_MS}ms) → Fail-Open APPROVE`;
    const payload = basePayload({
      transactionId: `tx_failopen_${Date.now()}`,
      amount: 9_999,
      contextSignals: {
        simSwapDetected: true,
        simSwapAgeHours: 1,
        crossLenderVelocityCount: 5,
      },
    });
    const out = await processPreSettlementEvaluation(payload, {
      artificialDelayMs: 80,
    });
    const pass =
      out.decision === "APPROVE" &&
      out.failOpenTriggered === true &&
      out.triggers.some((t) => t.ruleCode === "SAFEGUARD_FAIL_OPEN") &&
      out.regulatoryAction === "AUDIT_LOG_FLAG";
    results.push({
      name,
      pass,
      detail: `decision=${out.decision} failOpen=${out.failOpenTriggered} latency=${out.latencyMs}ms`,
    });
  }

  return results;
}

async function main() {
  console.log("AFIE Feature A — Pre-Settlement Pipeline Verification\n");
  const results = await runCases();
  let failed = 0;

  for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL";
    if (!r.pass) failed += 1;
    console.log(`[${mark}] ${r.name}`);
    console.log(`       ${r.detail}\n`);
  }

  console.log(
    failed === 0
      ? `All ${results.length} cases passed.`
      : `${failed}/${results.length} case(s) failed.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

void main();
