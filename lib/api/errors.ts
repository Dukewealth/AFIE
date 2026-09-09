import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MerchantAuthError } from "@/lib/auth/merchant";

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof MerchantAuthError) {
    return jsonError(error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    return jsonError("Invalid request payload", 400, error.flatten().fieldErrors);
  }

  if (error instanceof SyntaxError) {
    return jsonError("Malformed JSON body", 400);
  }

  console.error("[AFIE] Unhandled route error:", error);

  return jsonError("Internal server error", 500);
}
