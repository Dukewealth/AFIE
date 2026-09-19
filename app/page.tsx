import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "AFIE | Autonomous Fraud Halting at Settlement Speed",
  description:
    "Inline pre-authorization risk inference for African MFIs, S&Ls, and FinTechs. Sub-40ms deterministic halting before funds leave the ledger.",
};

export default function Home() {
  return <LandingPage />;
}
