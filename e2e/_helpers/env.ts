import { config as loadDotenv } from "dotenv";
import { resolve } from "path";

// Load .env from project root before any helper imports process.env
const root = resolve(__dirname, "../..");
loadDotenv({ path: resolve(root, ".env.test") });
loadDotenv({ path: resolve(root, ".env"), override: false });

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `[e2e] Missing env var ${key}. Set it in .env or .env.test before running playwright.`
    );
  }
  return v;
}

export const E2E_ENV = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:5001",
  // Used to namespace seeded rows so we can clean up without touching prod data
  seedTag: process.env.E2E_SEED_TAG || "e2e-fixture",
} as const;

// Supabase persists tokens under sb-<project-ref>-auth-token by default
export function getSupabaseStorageKey(): string {
  const m = E2E_ENV.supabaseUrl.match(/https?:\/\/([^.]+)\./);
  if (!m) throw new Error(`Cannot derive project ref from ${E2E_ENV.supabaseUrl}`);
  return `sb-${m[1]}-auth-token`;
}
