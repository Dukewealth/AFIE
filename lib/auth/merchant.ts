import { createServerSupabaseClient } from "@/lib/db/supabase";
import type { Merchant } from "@/lib/db/database.types";
import {
  getDevMerchantApiKey,
  isSupabaseConfigured,
} from "@/lib/dashboard/config";

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

function getDevMerchant(apiKey: string): Merchant | null {
  const devApiKey = getDevMerchantApiKey();
  if (!devApiKey || apiKey !== devApiKey) {
    return null;
  }

  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Development Merchant",
    api_key: devApiKey,
    webhook_url: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Validates merchant API key against Supabase merchants table.
 * Falls back to MERCHANT_API_KEY env var for local development.
 */
export async function validateMerchantApiKey(
  apiKey: string,
): Promise<Merchant> {
  const devMerchant = getDevMerchant(apiKey);

  if (!isSupabaseConfigured()) {
    if (devMerchant) {
      return devMerchant;
    }
    throw new MerchantAuthError("Invalid API key");
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: merchant, error } = await supabase
      .from("merchants")
      .select("*")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (error) {
      console.warn("[AFIE] Supabase merchant lookup failed:", error.message);
      if (devMerchant) {
        return devMerchant;
      }
      throw new MerchantAuthError("Failed to validate API key", 403);
    }

    if (merchant) {
      return merchant;
    }

    if (devMerchant) {
      return devMerchant;
    }

    throw new MerchantAuthError("Invalid API key");
  } catch (error) {
    if (devMerchant) {
      console.warn("[AFIE] Using development merchant after auth lookup failure.");
      return devMerchant;
    }

    if (error instanceof MerchantAuthError) {
      throw error;
    }

    throw new MerchantAuthError("Failed to validate API key", 403);
  }
}
