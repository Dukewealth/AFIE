import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AFIE pricing for African MFIs, S&Ls, and FinTechs — sandbox to production.",
};

const TIERS = [
  {
    name: "Sandbox",
    price: "$0",
    period: "14 days",
    points: [
      "10k evaluate calls",
      "Synthetic consortium graph",
      "RiskOps Studio access",
    ],
    cta: "Start sandbox",
    href: "/dashboard",
    highlight: false,
  },
  {
    name: "Institution",
    price: "$2.8k",
    period: "/ month",
    points: [
      "Inline pre-auth hooks",
      "Musoni / BankOne connectors",
      "Fail-open SLA + replay",
      "SAR export module",
    ],
    cta: "Launch Console",
    href: "/dashboard",
    highlight: true,
  },
  {
    name: "Consortium",
    price: "Custom",
    period: "multi-tenant",
    points: [
      "Cross-tenant hash graph",
      "Dedicated latency budget",
      "Central bank evidence packs",
      "On-prem / VPC deploy",
    ],
    cta: "Talk to us",
    href: "/compliance",
    highlight: false,
  },
] as const;

export default function PricingPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] text-[#8B95A8]">PRICING</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Infrastructure priced like risk ops, not vanity SaaS
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B95A8] sm:text-base">
          Start in sandbox. Scale when halted capital covers the bill — typically
          within the first month of production volume.
        </p>

        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-lg p-6 ${
                tier.highlight
                  ? "border border-emerald-500/35 bg-emerald-500/10"
                  : "afie-card"
              }`}
            >
              <h2 className="text-sm font-semibold text-white">{tier.name}</h2>
              <p className="mt-4 font-mono text-3xl tabular-nums tracking-tight text-white">
                {tier.price}
                <span className="ml-1 text-sm text-[#8B95A8]">{tier.period}</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[#8B95A8]">
                {tier.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                  tier.highlight
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "border border-white/[0.12] text-white hover:bg-white/[0.05]"
                }`}
              >
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
