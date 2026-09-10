import { NextResponse } from "next/server";
import { fetchDashboardSnapshot } from "@/lib/dashboard/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const snapshot = await fetchDashboardSnapshot();
  return NextResponse.json(snapshot, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
