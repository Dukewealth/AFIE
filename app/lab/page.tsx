import type { Metadata } from "next";
import { InvestorLabPage } from "@/components/lab/InvestorLab";

export const metadata: Metadata = {
  title: "Investor Evaluation Lab",
  description:
    "Multi-sector AFIE decision engine — fire MFI, remittance, SME, and MoMo scenarios with deterministic reason codes.",
};

export default function LabRoute() {
  return <InvestorLabPage />;
}
