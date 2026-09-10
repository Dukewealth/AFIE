import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/dashboard/config";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import type { HeuristicEvaluationResult } from "@/lib/fraud-engine/heuristics";
import {
  FraudActionSchema,
  riskScoreToAction,
  type FraudAction,
  type TransactionPayload,
} from "@/lib/fraud-engine/types";

const AGENT_TIMEOUT_MS = 450;
const RECENT_TX_LIMIT = 10;
const CLAUDE_MODEL = "claude-3-5-haiku-latest";

export const AgentResponseSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  action: FraudActionSchema,
  reason: z
    .string()
    .min(1)
    .refine((v) => v.trim().split(/\s+/).length <= 25, "reason max 25 words"),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentEvaluationSource = "AI_AGENT" | "HEURISTIC_FALLBACK";

export interface AgentEvaluationOutcome {
  risk_score: number;
  action: FraudAction;
  reason: string;
  source: AgentEvaluationSource;
  agent_latency_ms?: number;
  fallback_reason?: string;
}

interface RecentTransactionSummary {
  external_tx_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  risk_score: number;
  country_code: string | null;
  created_at: string;
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("your-anthropic")) return null;
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

export async function evaluateForensicAgent(
  payload: TransactionPayload,
  heuristicResult: HeuristicEvaluationResult,
): Promise<AgentEvaluationOutcome> {
  if (heuristicResult.status !== "FLAGGED") {
    throw new Error("Forensic agent only runs when heuristic status is FLAGGED");
  }

  const agentStart = performance.now();

  try {
    const client = getAnthropicClient();
    if (!client) {
      throw new Error("Anthropic API key not configured");
    }

    const recentTransactions = await fetchRecentTransactions(payload.user_id, payload.transaction_id);
    const prompt = buildForensicPrompt(payload, heuristicResult, recentTransactions);
    const parsed = await invokeClaudeWithTimeout(client, prompt);

    return {
      risk_score: parsed.risk_score,
      action: parsed.action,
      reason: parsed.reason,
      source: "AI_AGENT",
      agent_latency_ms: Math.round(performance.now() - agentStart),
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "Unknown agent failure";
    console.error("[AFIE] Forensic agent fallback:", fallbackReason);
    return {
      risk_score: heuristicResult.score,
      action: heuristicResult.action,
      reason: heuristicResult.reasons[0] ?? "Heuristic fallback after agent failure",
      source: "HEURISTIC_FALLBACK",
      agent_latency_ms: Math.round(performance.now() - agentStart),
      fallback_reason: fallbackReason,
    };
  }
}

async function fetchRecentTransactions(
  userId: string,
  excludeTxId: string,
): Promise<RecentTransactionSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "external_tx_id, amount, currency, payment_method, status, risk_score, country_code, created_at",
    )
    .eq("user_id", userId)
    .neq("external_tx_id", excludeTxId)
    .order("created_at", { ascending: false })
    .limit(RECENT_TX_LIMIT);

  if (error) {
    console.warn("[AFIE] Could not fetch recent transactions for agent:", error.message);
    return [];
  }

  return (data ?? []) as RecentTransactionSummary[];
}

function buildForensicPrompt(
  payload: TransactionPayload,
  heuristicResult: HeuristicEvaluationResult,
  recentTransactions: RecentTransactionSummary[],
): string {
  return [
    "You are a fraud forensic analyst. Respond with JSON only.",
    "",
    "Transaction:",
    JSON.stringify(
      {
        transaction_id: payload.transaction_id,
        user_id: payload.user_id,
        amount: payload.amount,
        currency: payload.currency,
        billing_country: payload.billing_country,
        payment_method: payload.payment_method,
        ip_address: payload.ip_address,
        device_fingerprint: payload.device_fingerprint,
        metadata: payload.metadata,
      },
      null,
      2,
    ),
    "",
    "Heuristic context:",
    JSON.stringify(
      {
        score: heuristicResult.score,
        triggered_rules: heuristicResult.triggeredRules,
        reasons: heuristicResult.reasons,
        velocity_stats: heuristicResult.velocityStats,
      },
      null,
      2,
    ),
    "",
    "Recent user transactions:",
    JSON.stringify(recentTransactions, null, 2),
    "",
    'Return JSON: {"risk_score":0-100,"action":"ALLOW|CHALLENGE|BLOCK","reason":"max 25 words"}',
  ].join("\n");
}

async function invokeClaudeWithTimeout(
  client: Anthropic,
  prompt: string,
): Promise<AgentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: 256,
        temperature: 0,
        system: "You are AFIE. Output valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal },
    );

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response contained no text");
    }

    return parseAgentResponse(textBlock.text);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Forensic agent timed out after ${AGENT_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAgentResponse(rawText: string): AgentResponse {
  const jsonText = extractJsonObject(rawText);
  const parsed = AgentResponseSchema.parse(JSON.parse(jsonText));
  return {
    ...parsed,
    action: riskScoreToAction(parsed.risk_score),
    reason: parsed.reason.trim(),
  };
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
