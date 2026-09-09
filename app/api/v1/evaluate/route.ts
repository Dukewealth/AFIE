import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  validateMerchantApiKey,
} from "@/lib/auth/merchant";
import { handleRouteError } from "@/lib/api/errors";
import { evaluateTransaction } from "@/lib/fraud-engine/evaluator";
import {
  TransactionPayloadSchema,
  type EvaluateResponse,
} from "@/lib/fraud-engine/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = extractBearerToken(request.headers.get("authorization"));
    const merchant = await validateMerchantApiKey(apiKey);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return handleRouteError(new SyntaxError("Malformed JSON body"));
    }

    const payload = TransactionPayloadSchema.parse(body);

    const result = await evaluateTransaction(payload, {
      merchantId: merchant.id,
    });

    const response: EvaluateResponse = {
      transaction_id: payload.transaction_id,
      ...result,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
