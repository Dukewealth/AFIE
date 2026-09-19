import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getDevMerchantApiKey } from "@/lib/dashboard/config";
import { fetchDashboardSnapshot } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await fetchDashboardSnapshot();
  const apiKey = getDevMerchantApiKey() ?? "afie_test_secret_key_12345";
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-[#090D16] text-slate-100">
      <DashboardClient
        initialTransactions={snapshot.transactions}
        initialKpis={snapshot.kpis}
        mode={snapshot.mode}
        apiKey={apiKey}
        apiBaseUrl={apiBaseUrl}
      />
    </main>
  );
}
