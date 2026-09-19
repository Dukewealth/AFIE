const BREAKTHROUGHS = [
  {
    n: "01",
    title: "Sub-40ms deterministic execution",
    body: "Compiled evaluation loop (Go/Rust core path) completes velocity, device, and graph checks before payment switch timeouts. No async queue between ingress and verdict.",
  },
  {
    n: "02",
    title: "Tokenized cross-tenant consortium",
    body: "SHA-256 salted entity hashes let competing MFIs share mule signals without exposing names, balances, or national IDs — aligned with BoG CISD, NDPR, and GDPR constraints.",
  },
  {
    n: "03",
    title: "Insider threat & ghost loan interceptor",
    body: "Correlates loan-officer login geolocation, approval velocity, and beneficiary payout accounts to surface ghost loans before disbursement posts.",
  },
  {
    n: "04",
    title: "USSD & offline-channel heuristics",
    body: "Multi-signal scoring for feature-phone USSD where cookies and biometrics do not exist — SIM tenure, dialer cadence, agent clustering, and beneficiary reuse.",
  },
] as const;

export function BentoBreakthroughs() {
  return (
    <section className="border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Four engineering breakthroughs
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[#8B95A8] sm:text-base">
          Not marketing pillars — the specific mechanisms that make inline
          halting viable on African rails.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {BREAKTHROUGHS.map((item) => (
            <article
              key={item.n}
              className="afie-card rounded-lg p-5 transition hover:border-white/[0.12] sm:p-6"
            >
              <p className="font-mono text-[11px] tabular-nums text-[#5C6678]">
                {item.n}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#8B95A8]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
