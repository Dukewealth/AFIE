import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  validateMerchantApiKey,
} from "@/lib/auth/merchant";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = extractBearerToken(request.headers.get("authorization"));
    const merchant = await validateMerchantApiKey(apiKey);

    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_LIMIT;

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      return jsonError("limit must be a positive integer", 400);
    }

    const limit = Math.min(parsedLimit, MAX_LIMIT);
    const supabase = createServerSupabaseClient();

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[AFIE] Failed to fetch transactions:", error);
      return jsonError("Failed to fetch transactions", 500);
    }

    return NextResponse.json(transactions ?? [], { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
