import type { TransactionStatus } from "@/lib/dashboard/types";

const COUNTRY_NAMES: Record<string, string> = {
  GH: "Ghana",
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  US: "United States",
  GB: "United Kingdom",
};

const RAIL_LABELS: Record<string, string> = {
  card: "Card",
  momo: "MoMo",
  bank_transfer: "Bank transfer",
};

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatRail(paymentMethod: string): string {
  return RAIL_LABELS[paymentMethod] ?? paymentMethod.replaceAll("_", " ");
}

export function formatCountry(code: string | null): string {
  if (!code) return "Unknown origin";
  return COUNTRY_NAMES[code] ?? code;
}

export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function isTransactionStatus(value: string): value is TransactionStatus {
  return value === "ALLOWED" || value === "CHALLENGED" || value === "BLOCKED";
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
