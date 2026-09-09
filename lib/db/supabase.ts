import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local or your deployment environment.",
    );
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Required for server-side database operations.",
    );
  }
  return key;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set it in .env.local or your deployment environment.",
    );
  }
  return key;
}

let serverClient: TypedSupabaseClient | null = null;
let browserClient: TypedSupabaseClient | null = null;

/**
 * Server-side Supabase client with service role privileges.
 * Use in API route handlers and server actions for privileged operations.
 */
export function createServerSupabaseClient(): TypedSupabaseClient {
  if (!serverClient) {
    serverClient = createClient<Database>(
      getSupabaseUrl(),
      getServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return serverClient;
}

/**
 * Client-side Supabase client with anon key.
 * Use in React components and dashboard realtime subscriptions.
 */
export function createBrowserSupabaseClient(): TypedSupabaseClient {
  if (!browserClient) {
    browserClient = createClient<Database>(getSupabaseUrl(), getAnonKey());
  }
  return browserClient;
}
