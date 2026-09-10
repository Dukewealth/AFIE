"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import type { TypedSupabaseClient } from "@/lib/db/supabase";

let browserClient: TypedSupabaseClient | null = null;

export function isBrowserSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.length > 0 &&
    anonKey.length > 0 &&
    !url.includes("your-project-ref") &&
    !anonKey.includes("your-supabase")
  );
}

export function getBrowserSupabaseClient(): TypedSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  browserClient = createClient<Database>(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  });

  return browserClient;
}
