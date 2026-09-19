"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, X } from "lucide-react";

type SnippetTab = "curl" | "node" | "python";

export function DeveloperModal({
  open,
  onClose,
  apiKey,
  apiBaseUrl,
}: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  apiBaseUrl: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [tab, setTab] = useState<SnippetTab>("curl");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const snippets = useMemo(
    () => buildSnippets(apiBaseUrl, apiKey),
    [apiBaseUrl, apiKey],
  );

  if (!open) return null;

  const masked =
    apiKey.length <= 8
      ? "••••••••"
      : `${apiKey.slice(0, 6)}${"•".repeat(Math.max(apiKey.length - 10, 4))}${apiKey.slice(-4)}`;

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close API portal"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-portal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-slate-500 uppercase">
              Developer portal
            </p>
            <h2 id="api-portal-title" className="mt-1 text-lg font-medium text-slate-100">
              API Credentials & Webhooks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-800 p-1.5 text-zinc-400 transition hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <p className="text-xs font-medium text-zinc-400">Merchant API key</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-emerald-300">
                {revealed ? apiKey : masked}
              </code>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button
                type="button"
                onClick={() => void copy("key", apiKey)}
                className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {copied === "key" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </button>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["curl", "cURL"],
                  ["node", "Node.js"],
                  ["python", "Python"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition ${
                    tab === id
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void copy("snippet", snippets[tab])}
                className="ml-auto inline-flex items-center gap-1.5 rounded border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {copied === "snippet" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy snippet
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded border border-zinc-800 bg-zinc-900/80 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
              {snippets[tab]}
            </pre>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-zinc-400">Sample request</p>
              <pre className="mt-2 overflow-x-auto rounded border border-zinc-800 bg-zinc-900/80 p-3 font-mono text-[11px] text-zinc-300">
{`{
  "transaction_id": "tx_8912401",
  "user_id": "usr_4021",
  "amount": 250.00,
  "currency": "USD",
  "payment_method": "card",
  "ip_address": "102.176.45.12",
  "device_fingerprint": "hash_dev_9918",
  "billing_country": "GH",
  "metadata": {
    "account_age_days": 3,
    "previous_successful_tx": 1
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Sample response</p>
              <pre className="mt-2 overflow-x-auto rounded border border-zinc-800 bg-zinc-900/80 p-3 font-mono text-[11px] text-zinc-300">
{`{
  "transaction_id": "tx_8912401",
  "action": "BLOCK",
  "risk_score": 88,
  "reasons": [
    "High velocity: 4 attempts in past 3 minutes"
  ],
  "latency_ms": 58,
  "timestamp": "2026-09-11T16:00:00.000Z"
}`}
              </pre>
            </div>
          </section>

          <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs font-medium text-zinc-300">Handling actions</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
              <li>
                <span className="font-mono text-emerald-400">ALLOW</span> — process the payment immediately.
              </li>
              <li>
                <span className="font-mono text-amber-300">CHALLENGE</span> — trigger OTP / step-up verification before capture.
              </li>
              <li>
                <span className="font-mono text-rose-400">BLOCK</span> — reject the payment; do not authorize funds.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function buildSnippets(apiBaseUrl: string, apiKey: string): Record<SnippetTab, string> {
  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/api/v1/evaluate`;

  return {
    curl: `curl -X POST '${endpoint}' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "transaction_id": "tx_8912401",
    "user_id": "usr_4021",
    "amount": 250.00,
    "currency": "USD",
    "payment_method": "card",
    "ip_address": "102.176.45.12",
    "device_fingerprint": "hash_dev_9918",
    "billing_country": "GH",
    "metadata": { "account_age_days": 3, "previous_successful_tx": 1 }
  }'`,
    node: `const response = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${apiKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transaction_id: "tx_8912401",
    user_id: "usr_4021",
    amount: 250.0,
    currency: "USD",
    payment_method: "card",
    ip_address: "102.176.45.12",
    device_fingerprint: "hash_dev_9918",
    billing_country: "GH",
    metadata: { account_age_days: 3, previous_successful_tx: 1 },
  }),
});

const verdict = await response.json();
console.log(verdict.action, verdict.risk_score);`,
    python: `import requests

response = requests.post(
    "${endpoint}",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "transaction_id": "tx_8912401",
        "user_id": "usr_4021",
        "amount": 250.00,
        "currency": "USD",
        "payment_method": "card",
        "ip_address": "102.176.45.12",
        "device_fingerprint": "hash_dev_9918",
        "billing_country": "GH",
        "metadata": {"account_age_days": 3, "previous_successful_tx": 1},
    },
    timeout=5,
)

verdict = response.json()
print(verdict["action"], verdict["risk_score"])`,
  };
}
