import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../backend/types/database";
import { FRONTEND_ENV } from "./env";

const SUPABASE_URL = FRONTEND_ENV.supabaseUrl;

function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.startsWith(SUPABASE_URL)) {
    const path = url.slice(SUPABASE_URL.length);
    const proxiedUrl = `/api/supabase-proxy${path}`;

    if (typeof input === "string") {
      input = proxiedUrl;
    } else if (input instanceof URL) {
      input = new URL(proxiedUrl, window.location.origin);
    } else {
      input = new Request(proxiedUrl, input);
    }
  }

  return globalThis.fetch(input, init);
}

export const supabase = createClient<Database>(
  FRONTEND_ENV.supabaseUrl,
  FRONTEND_ENV.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
    global: {
      // The /api/supabase-proxy route only exists in local dev. In production
      // it 404s, so gate the proxy to dev only — otherwise any normalization of
      // VITE_SUPABASE_URL (e.g. trimming a stray trailing newline) would flip
      // the prefix match on and break ALL auth/REST traffic in prod.
      fetch: import.meta.env.DEV ? proxyFetch : globalThis.fetch,
    },
  }
);
