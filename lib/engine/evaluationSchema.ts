import { z } from "zod";
import type { EvaluationPayload } from "@/types/engine";

export const EvaluationPayloadSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  transactionId: z.string().min(1, "transactionId is required"),
  sector: z.enum([
    "MFI_CREDIT",
    "B2B_REMITTANCE",
    "SME_COMMERCE",
    "INSTANT_BANKING_MOMO",
  ]),
  rail: z.enum([
    "MTN_MOMO",
    "TELECEL_CASH",
    "AIRTELTIGO_MONEY",
    "GHIPSS_GIP",
    "NIBSS_NIP",
    "CARD_ACQUIRER",
  ]),
  amount: z.number().nonnegative("amount must be non-negative"),
  currency: z.string().min(1, "currency is required"),
  sender: z.object({
    accountId: z.string().min(1, "sender.accountId is required"),
    identityHash: z.string().min(1, "sender.identityHash is required"),
    ipAddress: z.string().min(1, "sender.ipAddress is required"),
    deviceFingerprint: z.string().optional(),
  }),
  beneficiary: z.object({
    accountId: z.string().min(1, "beneficiary.accountId is required"),
    accountHash: z.string().min(1, "beneficiary.accountHash is required"),
    accountAgeDays: z.number().nonnegative("beneficiary.accountAgeDays must be non-negative"),
  }),
  contextSignals: z
    .object({
      simSwapDetected: z.boolean().optional(),
      simSwapAgeHours: z.number().nonnegative().optional(),
      crossLenderVelocityCount: z.number().int().nonnegative().optional(),
      staffApproverId: z.string().optional(),
      staffApproverIp: z.string().optional(),
      isTorOrVpn: z.boolean().optional(),
      cardTestingVelocity: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export type EvaluationPayloadInput = z.infer<typeof EvaluationPayloadSchema>;

export function assertEvaluationPayload(body: unknown): EvaluationPayload {
  return EvaluationPayloadSchema.parse(body);
}
