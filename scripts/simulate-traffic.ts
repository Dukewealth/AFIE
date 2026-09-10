import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { EvaluateResponse, PaymentMethod, TransactionPayload } from "../lib/fraud-engine/types";

const EVALUATE_URL =
  process.env.AFIE_EVALUATE_URL ?? "http://localhost:3000/api/v1/evaluate";
const MIN_INTERVAL_MS = 1_000;
const MAX_INTERVAL_MS = 2_000;
const VELOCITY_BURST_COUNT = 5;
const VELOCITY_BURST_GAP_MS = 350;

const BLACKLIST_IP = "203.0.113.50";
const BLACKLIST_DEVICE = "blacklist_dev_sim_001";

const NORMAL_USERS = [
  {
    user_id: "usr_1001",
    ip_address: "197.251.14.90",
    device_fingerprint: "dev_norm_1001",
    billing_country: "GH",
    payment_method: "card" as PaymentMethod,
  },
  {
    user_id: "usr_1002",
    ip_address: "154.160.22.8",
    device_fingerprint: "dev_norm_1002",
    billing_country: "GH",
    payment_method: "momo" as PaymentMethod,
  },
  {
    user_id: "usr_1003",
    ip_address: "102.176.45.12",
    device_fingerprint: "dev_norm_1003",
    billing_country: "GH",
    payment_method: "card" as PaymentMethod,
  },
  {
    user_id: "usr_1004",
    ip_address: "41.190.78.22",
    device_fingerprint: "dev_norm_1004",
    billing_country: "NG",
    payment_method: "bank_transfer" as PaymentMethod,
  },
] as const;

const ATO_USERS = [
  { user_id: "usr_8821", usual_country: "GH", usual_ip: "102.176.45.12" },
  { user_id: "usr_4401", usual_country: "NG", usual_ip: "154.160.22.8" },
] as const;

type TrafficProfile = "normal" | "velocity" | "ato" | "blacklist";

interface ApiErrorBody {
  error?: string;
}

let txCounter = 0;
let running = true;
let inFlight = 0;

function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};

  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function nextTransactionId(): string {
  txCounter += 1;
  return `tx_sim_${Date.now()}_${txCounter}`;
}

function pickProfile(): TrafficProfile {
  const roll = Math.random() * 100;
  if (roll < 70) return "normal";
  if (roll < 85) return "velocity";
  if (roll < 95) return "ato";
  return "blacklist";
}

function buildNormalPayload(): TransactionPayload {
  const user = NORMAL_USERS[randomInt(0, NORMAL_USERS.length - 1)]!;
  return {
    transaction_id: nextTransactionId(),
    user_id: user.user_id,
    amount: randomFloat(15, 95),
    currency: "USD",
    payment_method: user.payment_method,
    ip_address: user.ip_address,
    device_fingerprint: user.device_fingerprint,
    billing_country: user.billing_country,
    metadata: {
      account_age_days: randomInt(90, 720),
      previous_successful_tx: randomInt(5, 40),
      profile: "normal",
    },
  };
}

function buildVelocityPayload(deviceFingerprint: string, burstIndex: number): TransactionPayload {
  return {
    transaction_id: nextTransactionId(),
    user_id: `usr_vel_${deviceFingerprint.slice(-4)}`,
    amount: randomFloat(20, 120),
    currency: "USD",
    payment_method: "card",
    ip_address: "198.51.100.44",
    device_fingerprint: deviceFingerprint,
    billing_country: "GH",
    metadata: {
      account_age_days: randomInt(10, 60),
      previous_successful_tx: randomInt(1, 8),
      profile: "velocity",
      burst_index: burstIndex,
      card_last4: String(1000 + burstIndex).slice(-4),
      card_bin: `424242${String(10 + burstIndex).padStart(2, "0")}`,
    },
  };
}

function buildAtoPayload(): TransactionPayload {
  const victim = ATO_USERS[randomInt(0, ATO_USERS.length - 1)]!;
  const unusualCountries = ["RU", "CN", "BR", "UA"] as const;
  const unusualIps = ["185.220.101.42", "103.21.244.0", "177.54.148.90"] as const;

  return {
    transaction_id: nextTransactionId(),
    user_id: victim.user_id,
    amount: randomFloat(2_500, 4_800),
    currency: "USD",
    payment_method: "card",
    ip_address: unusualIps[randomInt(0, unusualIps.length - 1)]!,
    device_fingerprint: `dev_ato_${victim.user_id}`,
    billing_country: unusualCountries[randomInt(0, unusualCountries.length - 1)]!,
    metadata: {
      account_age_days: randomInt(180, 900),
      previous_successful_tx: randomInt(20, 80),
      profile: "ato",
      usual_country: victim.usual_country,
      usual_ip: victim.usual_ip,
    },
  };
}

function buildBlacklistPayload(): TransactionPayload {
  const useIpHit = Math.random() < 0.5;

  return {
    transaction_id: nextTransactionId(),
    user_id: "usr_blacklist_probe",
    amount: randomFloat(40, 180),
    currency: "USD",
    payment_method: "card",
    ip_address: useIpHit ? BLACKLIST_IP : "198.51.100.10",
    device_fingerprint: useIpHit ? "dev_probe_clean" : BLACKLIST_DEVICE,
    billing_country: "GH",
    metadata: {
      account_age_days: randomInt(30, 200),
      previous_successful_tx: randomInt(2, 15),
      profile: "blacklist",
      blacklist_vector: useIpHit ? "ip" : "device",
    },
  };
}

function buildPayload(profile: TrafficProfile, velocityDevice?: string, burstIndex = 0): TransactionPayload {
  switch (profile) {
    case "normal":
      return buildNormalPayload();
    case "velocity":
      return buildVelocityPayload(
        velocityDevice ?? `dev_vel_${Date.now().toString(36)}`,
        burstIndex,
      );
    case "ato":
      return buildAtoPayload();
    case "blacklist":
      return buildBlacklistPayload();
  }
}

function formatDecision(action: string): string {
  return action.padEnd(9, " ");
}

function logResult(
  profile: TrafficProfile,
  payload: TransactionPayload,
  response: EvaluateResponse,
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] ${payload.transaction_id}  ${formatDecision(response.action)}  score=${String(response.risk_score).padStart(3, " ")}  latency=${String(response.latency_ms).padStart(4, " ")}ms  profile=${profile}`,
  );
}

function logError(profile: TrafficProfile, payload: TransactionPayload, message: string): void {
  const timestamp = new Date().toISOString();
  console.error(
    `[${timestamp}] ${payload.transaction_id}  ERROR     profile=${profile}  ${message}`,
  );
}

async function evaluateTransaction(
  apiKey: string,
  profile: TrafficProfile,
  payload: TransactionPayload,
): Promise<void> {
  inFlight += 1;

  try {
    const response = await fetch(EVALUATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as EvaluateResponse | ApiErrorBody;

    if (!response.ok) {
      const message =
        typeof body === "object" && body && "error" in body && body.error
          ? body.error
          : `HTTP ${response.status}`;
      logError(profile, payload, message);
      return;
    }

    logResult(profile, payload, body as EvaluateResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request failure";
    logError(profile, payload, message);
  } finally {
    inFlight -= 1;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function runVelocityBurst(apiKey: string): Promise<void> {
  const deviceFingerprint = `dev_vel_${Date.now().toString(36)}`;
  console.log(
    `\n[AFIE] Velocity burst started (${VELOCITY_BURST_COUNT} tx / 10s) device=${deviceFingerprint}\n`,
  );

  for (let index = 0; index < VELOCITY_BURST_COUNT; index += 1) {
    if (!running) break;
    const payload = buildPayload("velocity", deviceFingerprint, index + 1);
    await evaluateTransaction(apiKey, "velocity", payload);
    if (index < VELOCITY_BURST_COUNT - 1) {
      await sleep(VELOCITY_BURST_GAP_MS);
    }
  }

  console.log("\n[AFIE] Velocity burst complete\n");
}

async function runCycle(apiKey: string): Promise<void> {
  const profile = pickProfile();

  if (profile === "velocity") {
    await runVelocityBurst(apiKey);
    return;
  }

  const payload = buildPayload(profile);
  await evaluateTransaction(apiKey, profile, payload);
}

function resolveApiKey(): string {
  const envLocal = loadEnvLocal();
  const apiKey =
    process.env.MERCHANT_API_KEY ?? envLocal.MERCHANT_API_KEY ?? "";

  if (!apiKey) {
    throw new Error(
      "MERCHANT_API_KEY not found. Set it in .env.local or the environment.",
    );
  }

  return apiKey;
}

function registerShutdownHandlers(): void {
  const shutdown = (signal: NodeJS.Signals) => {
    if (!running) return;
    running = false;
    console.log(`\n[AFIE] Received ${signal}. Finishing in-flight requests…`);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main(): Promise<void> {
  const apiKey = resolveApiKey();
  registerShutdownHandlers();

  console.log("[AFIE] Synthetic traffic simulator");
  console.log(`[AFIE] Target: ${EVALUATE_URL}`);
  console.log("[AFIE] Profiles: 70% normal · 15% velocity · 10% ATO · 5% blacklist");
  console.log(
    `[AFIE] Blacklist probes use ip=${BLACKLIST_IP} or device=${BLACKLIST_DEVICE}`,
  );
  console.log("[AFIE] Press Ctrl+C to stop\n");

  while (running) {
    await runCycle(apiKey);

    if (!running) break;

    const delay = randomInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
    await sleep(delay);
  }

  while (inFlight > 0) {
    await sleep(100);
  }

  console.log("[AFIE] Simulator stopped.");
}

main().catch((error) => {
  console.error("[AFIE] Simulator failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
