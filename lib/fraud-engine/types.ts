import { z } from "zod";

/** Supported payment methods per SPEC schema. */
export const PaymentMethodSchema = z.enum([
  "card",
  "momo",
  "bank_transfer",
]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/** Fraud decision actions mapped to risk score bands. */
export const FraudActionSchema = z.enum(["ALLOW", "CHALLENGE", "BLOCK"]);

export type FraudAction = z.infer<typeof FraudActionSchema>;

/** Incoming transaction payload from merchant POST /api/v1/evaluate. */
export const TransactionPayloadSchema = z.object({
  transaction_id: z
    .string()
    .min(1, "transaction_id is required")
    .max(128, "transaction_id must be at most 128 characters"),
  user_id: z
    .string()
    .min(1, "user_id is required")
    .max(128, "user_id must be at most 128 characters"),
  amount: z
    .number()
    .positive("amount must be greater than zero")
    .max(999_999_999.99, "amount exceeds maximum allowed value"),
  currency: z
    .string()
    .length(3, "currency must be a 3-letter ISO code")
    .regex(/^[A-Z]{3}$/, "currency must be uppercase ISO 4217 code")
    .default("USD"),
  payment_method: PaymentMethodSchema,
  ip_address: z.union([z.ipv4(), z.ipv6()], {
    error: "ip_address must be a valid IPv4 or IPv6 address",
  }),
  device_fingerprint: z
    .string()
    .min(1, "device_fingerprint is required")
    .max(256, "device_fingerprint must be at most 256 characters"),
  billing_country: z
    .string()
    .length(2, "billing_country must be a 2-letter ISO country code")
    .regex(/^[A-Z]{2}$/, "billing_country must be uppercase ISO 3166-1 alpha-2"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type TransactionPayload = z.infer<typeof TransactionPayloadSchema>;

/** Structured evaluation output from the fraud engine. */
export const EvaluationResultSchema = z.object({
  action: FraudActionSchema,
  risk_score: z
    .number()
    .int("risk_score must be an integer")
    .min(0, "risk_score must be at least 0")
    .max(100, "risk_score must be at most 100"),
  reasons: z.array(z.string()),
  latency_ms: z.number().int().nonnegative("latency_ms must be non-negative"),
  timestamp: z.iso.datetime({ message: "timestamp must be ISO 8601" }),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

/** API response shape for POST /api/v1/evaluate. */
export const EvaluateResponseSchema = EvaluationResultSchema.extend({
  transaction_id: z.string(),
});

export type EvaluateResponse = z.infer<typeof EvaluateResponseSchema>;

/** Maps a numeric risk score to the corresponding fraud action. */
export function riskScoreToAction(score: number): FraudAction {
  if (score <= 29) return "ALLOW";
  if (score <= 69) return "CHALLENGE";
  return "BLOCK";
}

/** Maps a fraud action to the persisted transaction status. */
export function actionToStatus(action: FraudAction): "ALLOWED" | "CHALLENGED" | "BLOCKED" {
  const map: Record<FraudAction, "ALLOWED" | "CHALLENGED" | "BLOCKED"> = {
    ALLOW: "ALLOWED",
    CHALLENGE: "CHALLENGED",
    BLOCK: "BLOCKED",
  };
  return map[action];
}
