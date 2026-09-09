import { createServerSupabaseClient } from "@/lib/db/supabase";
import type { Merchant } from "@/lib/db/database.types";

export class MerchantAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "MerchantAuthError";
  }
}

/** Extracts Bearer token from Authorization header. */
export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader) {
    throw new MerchantAuthError("Missing Authorization header");
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    throw new MerchantAuthError(
      "Invalid Authorization header. Expected: Bearer <API_KEY>",
    );
  }

  return token.trim();
}

/**
 * Validates merchant API key against Supabase merchants table.
 * Falls back to MERCHANT_API_KEY env var for local development.
 */
export async function validateMerchantApiKey(
  apiKey: string,
): Promise<Merchant> {
  const supabase = createServerSupabaseClient();

  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) {
    throw new MerchantAuthError(
      "Failed to validate API key",
      403,
    );
  }

  if (merchant) {
    return merchant;
  }

  const devApiKey = process.env.MERCHANT_API_KEY;
  if (devApiKey && apiKey === devApiKey) {
    return {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Development Merchant",
      api_key: devApiKey,
      webhook_url: null,
      created_at: new Date().toISOString(),
    };
  }

  throw new MerchantAuthError("Invalid API key");
}
