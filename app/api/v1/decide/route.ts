import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/errors";
import { evaluateDecision } from "@/lib/engine/decisionEngine";
import { DecisionPayloadSchema } from "@/lib/engine/schema";

export const runtime = "nodejs";

/**
 * Multi-sector synchronous decision endpoint (investor lab / connectors).
 * Auth-light for hackathon demos — production should reuse merchant API keys.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return handleRouteError(new SyntaxError("Malformed JSON body"));
    }

    const payload = DecisionPayloadSchema.parse(body);
    const result = evaluateDecision(payload);

    return NextResponse.json(
      {
        transactionId: payload.transactionId,
        sector: payload.sector,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
