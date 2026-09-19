import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { SarGenerator } from "@/components/compliance/SarGenerator";

export const metadata: Metadata = {
  title: "Compliance | AFIE Central Bank Assurance",
  description:
    "BoG CISD, CBN anti-fraud guidelines, and automated SAR generation for African MFIs.",
};

const FRAMEWORKS = [
  {
    title: "Bank of Ghana — CISD",
    body: "Cyber & Information Security Directive controls mapped to access logging, incident response, and third-party risk. AFIE emits immutable decision audit trails suitable for CISD evidence packs.",
  },
  {
    title: "CBN Anti-Fraud Guidelines",
    body: "Supports Nigerian instant payment fraud controls with NIBSS-aligned reason codes, velocity ceilings, and beneficiary reuse detection prior to NIP settlement.",
  },
  {
    title: "Data Protection (NDPR / GDPR posture)",
    body: "Consortium sharing uses salted hashes only. Raw PII never leaves the originating tenant. Cross-border transfer assessments treat digests as non-personal where local counsel agrees.",
  },
] as const;

export default function CompliancePage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">COMPLIANCE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Central bank & regulatory assurance
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Institutional legitimacy for risk and compliance officers — not a
          marketing checklist.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {FRAMEWORKS.map((f) => (
            <article key={f.title} className="afie-card rounded-lg p-5">
              <h2 className="text-sm font-semibold text-white">{f.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#8B95A8]">
                {f.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <SarGenerator />
        </div>
      </div>
    </SiteShell>
  );
}
