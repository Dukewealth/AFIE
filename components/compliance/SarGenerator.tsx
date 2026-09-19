"use client";

import { useRef, useState } from "react";

const INCIDENT = {
  id: "AFIE-SAR-2026-0919-0042",
  subject: "Suspected mule syndicate · pre-settlement halt",
  msisdn_hash: "sha256:7f3a9c…e91c",
  lenders: 3,
  window: "8 minutes",
  amount: "GHS 2,500.00",
  decision: "HALT",
  reason: "ERR_CONSORTIUM_BENEFICIARY_HIT",
  officer: "auto-generated · AFIE Compliance Module",
};

export function SarGenerator() {
  const [open, setOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const download = () => {
    setOpen(true);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div className="afie-card rounded-lg p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white">
        Automated SAR preview
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#8B95A8]">
        Generate a centrally formatted AML/CFT suspicious activity filing from a
        halted incident snapshot. Print or save as PDF from the browser dialog.
      </p>

      <button
        type="button"
        onClick={download}
        className="mt-6 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#06080D] transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
      >
        Generate SAR from incident snapshot
      </button>

      {open ? (
        <div
          id="afie-sar-report"
          ref={reportRef}
          className="mt-6 rounded-md border border-white/[0.12] bg-white p-6 text-[#18181b]"
        >
          <p className="font-mono text-[10px] tracking-wide text-[#64748b]">
            SUSPICIOUS ACTIVITY REPORT · PREVIEW
          </p>
          <h4 className="mt-2 text-lg font-semibold">{INCIDENT.subject}</h4>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#64748b]">Filing ID</dt>
              <dd className="font-mono">{INCIDENT.id}</dd>
            </div>
            <div>
              <dt className="text-[#64748b]">Decision</dt>
              <dd className="font-mono">{INCIDENT.decision}</dd>
            </div>
            <div>
              <dt className="text-[#64748b]">Entity hash</dt>
              <dd className="font-mono">{INCIDENT.msisdn_hash}</dd>
            </div>
            <div>
              <dt className="text-[#64748b]">Amount</dt>
              <dd className="font-mono">{INCIDENT.amount}</dd>
            </div>
            <div>
              <dt className="text-[#64748b]">Cross-tenant hits</dt>
              <dd className="font-mono">{INCIDENT.lenders} lenders · {INCIDENT.window}</dd>
            </div>
            <div>
              <dt className="text-[#64748b]">Reason code</dt>
              <dd className="font-mono">{INCIDENT.reason}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-[#334155]">
            Narrative: Tokenized beneficiary matched high-risk mule cluster
            across three consortium members within an eight-minute window using
            distinct synthetic national ID hashes. Funds were locked
            pre-disbursement. No customer PII is included in this filing body;
            identifiers remain salted digests pending regulator request under
            applicable CISD / CBN procedures.
          </p>
          <p className="mt-4 font-mono text-[11px] text-[#64748b]">
            Prepared by {INCIDENT.officer}
          </p>
        </div>
      ) : null}
    </div>
  );
}
