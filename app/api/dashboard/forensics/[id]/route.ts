import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { fetchTransactionForensics } from "@/lib/dashboard/queries";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id) {
      return jsonError("Transaction id is required", 400);
    }

    const payload = await fetchTransactionForensics(id);
    if (!payload) {
      return jsonError("Transaction not found", 404);
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
