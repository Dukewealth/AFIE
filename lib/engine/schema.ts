import { z } from "zod";

export const DecisionPayloadSchema = z.object({
  tenantId: z.string().min(1),
  sector: z.enum([
    "MFI_CREDIT",
    "B2B_REMITTANCE",
    "SME_COMMERCE",
    "INSTANT_BANKING_MOMO",
  ]),
  transactionId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
  channel: z.enum(["WEB_APP", "MOBILE_SDK", "USSD", "API_GATEWAY"]),
  deviceTelemetry: z
    .object({
      fingerprintHash: z.string(),
      ipAddress: z.string(),
      isVpnOrProxy: z.boolean(),
      deviceAgeDays: z.number().nonnegative(),
    })
    .optional(),
  telecomSignals: z
    .object({
      simSwapDetected: z.boolean(),
      simSwapHoursAgo: z.number().nonnegative().optional(),
    })
    .optional(),
  consortiumSignals: z
    .object({
      entityBlacklistedAcrossTenants: z.boolean(),
      crossLenderActiveApplications24h: z.number().int().nonnegative(),
    })
    .optional(),
  insiderAudit: z
    .object({
      approverStaffId: z.string().optional(),
      approverIpMatchBeneficiary: z.boolean(),
    })
    .optional(),
});

export type DecisionPayloadInput = z.infer<typeof DecisionPayloadSchema>;
