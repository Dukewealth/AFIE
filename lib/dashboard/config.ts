const PLACEHOLDER_MARKERS = [
  "your-project-ref",
  "your-supabase",
  "your-redis",
  "your-upstash",
  "your-anthropic",
  "changeme",
  "placeholder",
] as const;

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    !isPlaceholder(url) &&
    !isPlaceholder(serviceKey) &&
    !isPlaceholder(anonKey)
  );
}

export function isSupabaseBrowserConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !isPlaceholder(url) && !isPlaceholder(anonKey);
}

export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return !isPlaceholder(url) && !isPlaceholder(token);
}

export function getDevMerchantApiKey(): string | undefined {
  const apiKey = process.env.MERCHANT_API_KEY;
  return isPlaceholder(apiKey) ? undefined : apiKey;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
