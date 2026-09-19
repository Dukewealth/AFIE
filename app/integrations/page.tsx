import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { IntegrationsStudio } from "@/components/integrations/IntegrationsStudio";

export const metadata: Metadata = {
  title: "Integrations | AFIE MFI & FinTech Connectors",
  description:
    "Zero-code connectors for Musoni, BankOne, Mambu, Oradian, MoMo rails, GhIPSS, and NIBSS — with a live code playground.",
};

export default function IntegrationsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">INTEGRATIONS</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Zero-code MFI & FinTech connectors
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Plug into pre-disbursement without a six-month core rewrite. Community
          banks and S&Ls get webhook plugins; engineering teams get OpenAPI.
        </p>
        <div className="mt-10">
          <IntegrationsStudio />
        </div>
      </div>
    </SiteShell>
  );
}
