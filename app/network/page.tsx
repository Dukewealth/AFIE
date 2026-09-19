import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { ConsortiumGraph } from "@/components/network/ConsortiumGraph";

export const metadata: Metadata = {
  title: "Network | AFIE Cross-Tenant Consortium",
  description:
    "Privacy-preserving entity graph for shared mule defense across African MFIs without exposing PII.",
};

export default function NetworkPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">NETWORK INTELLIGENCE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Cross-tenant consortium graph
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Shared defense without shared books. Select a flagged mule wallet to
          see how one MSISDN lights up across lenders — resolved only through
          salted hashes.
        </p>
        <div className="mt-10">
          <ConsortiumGraph />
        </div>
      </div>
    </SiteShell>
  );
}
