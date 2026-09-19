"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Lang = "curl" | "typescript" | "python" | "go";

const SNIPPETS: Record<Lang, string> = {
  curl: `curl -X POST https://api.afie.io/v1/evaluate \\
  -H "Authorization: Bearer $AFIE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transaction_id": "disb_99102",
    "amount": 2500.00,
    "currency": "GHS",
    "payment_method": "momo",
    "device_fingerprint": "hash_dev_9918",
    "billing_country": "GH"
  }'`,
  typescript: `const res = await fetch("https://api.afie.io/v1/evaluate", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.AFIE_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transaction_id: "disb_99102",
    amount: 2500,
    currency: "GHS",
    payment_method: "momo",
    device_fingerprint: "hash_dev_9918",
    billing_country: "GH",
  }),
});

const verdict = await res.json();
// { decision: "HALT", risk_score: 0.89, latency_ms: 32 }`,
  python: `import requests, os

r = requests.post(
    "https://api.afie.io/v1/evaluate",
    headers={"Authorization": f"Bearer {os.environ['AFIE_KEY']}"},
    json={
        "transaction_id": "disb_99102",
        "amount": 2500.0,
        "currency": "GHS",
        "payment_method": "momo",
        "device_fingerprint": "hash_dev_9918",
        "billing_country": "GH",
    },
    timeout=2,
)
print(r.json())`,
  go: `req, _ := http.NewRequest("POST", "https://api.afie.io/v1/evaluate",
  strings.NewReader(\`{"transaction_id":"disb_99102","amount":2500,"currency":"GHS","payment_method":"momo"}\`))
req.Header.Set("Authorization", "Bearer "+os.Getenv("AFIE_KEY"))
req.Header.Set("Content-Type", "application/json")
resp, err := http.DefaultClient.Do(req)
// decode → decision HALT, risk_score 0.89`,
};

const CONNECTORS = [
  {
    name: "Musoni Core Banking",
    kind: "1-Click Webhook Plugin",
    status: "Ready",
  },
  {
    name: "Qore BankOne",
    kind: "Disbursement Interceptor Adapter",
    status: "Ready",
  },
  {
    name: "Mambu",
    kind: "Pre-disbursement Hook",
    status: "Ready",
  },
  {
    name: "Oradian",
    kind: "Ledger Gate Adapter",
    status: "Ready",
  },
  {
    name: "MTN MoMo",
    kind: "Mobile Money Gateway",
    status: "Ready",
  },
  {
    name: "Telecel Cash",
    kind: "Mobile Money Gateway",
    status: "Ready",
  },
  {
    name: "GhIPSS Instant Pay (GIP)",
    kind: "Instant Payment Rail",
    status: "Ready",
  },
  {
    name: "NIBSS NIP",
    kind: "Nigeria Instant Payments",
    status: "Ready",
  },
] as const;

export function IntegrationsStudio() {
  const [lang, setLang] = useState<Lang>("curl");
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(CONNECTORS[0].name);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[lang]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-white">Connector catalog</h2>
        <p className="mt-2 text-sm text-[#8B95A8]">
          Select a connector to see the integration posture. All ship with
          fail-open defaults.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CONNECTORS.map((c) => {
            const on = active === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setActive(c.name)}
                className={`rounded-lg border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${
                  on
                    ? "border-emerald-500/35 bg-emerald-500/10"
                    : "border-white/[0.06] bg-[#0B0F17] hover:border-white/[0.12]"
                }`}
              >
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="mt-2 text-xs text-[#8B95A8]">{c.kind}</p>
                <p className="mt-3 font-mono text-[10px] text-emerald-400">
                  {c.status}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#111827] px-4 py-3 text-sm text-[#C5CCD6]">
          <span className="text-[#8B95A8]">Active · </span>
          {active}
          <span className="text-[#5C6678]">
            {" "}
            — webhook signing + replay buffer enabled
          </span>
        </div>
      </div>

      <div id="playground" className="scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Code playground</h2>
            <p className="mt-2 text-sm text-[#8B95A8]">
              Synchronous evaluate — copy a payload and wire pre-disbursement.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0B0F17]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["curl", "cURL"],
                  ["typescript", "TypeScript"],
                  ["python", "Python"],
                  ["go", "Go"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLang(id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    lang === id
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-[#5C6678] hover:text-[#C5CCD6]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#8B95A8] hover:text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
          <pre className="max-h-[380px] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[#C5CCD6]">
            {SNIPPETS[lang]}
          </pre>
          <div className="border-t border-white/[0.06] bg-[#06080D] px-4 py-3 font-mono text-[11px] text-emerald-400">
            {`{ "decision": "HALT", "risk_score": 0.89, "latency_ms": 32, "reason_codes": ["ERR_DEVICE_REUSE_CLUSTER"] }`}
          </div>
        </div>
      </div>
    </div>
  );
}
