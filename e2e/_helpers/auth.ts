import type { Page } from "@playwright/test";
import { admin } from "./supabase";
import { E2E_ENV, getSupabaseStorageKey } from "./env";

export type SeededUser = {
  id: string;
  email: string;
  password: string;
  role: "super_admin" | "admin" | "agency" | "company" | "candidate";
  agencyId?: string | null;
};

// Create-or-fetch a Supabase auth user with the given role.
// Idempotent across runs — tags rows with E2E_ENV.seedTag in user_metadata.
export async function ensureAuthUser(args: {
  email: string;
  password: string;
  role: SeededUser["role"];
  agencyId?: string | null;
  name?: string;
}): Promise<SeededUser> {
  const { email, password, role, agencyId, name } = args;

  // Try to find existing
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = list?.users.find((u) => u.email === email);

  let userId: string;
  if (found) {
    userId = found.id;
    // Reset password so the test can sign in deterministically
    await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { ...found.user_metadata, role, agency_id: agencyId, e2e_tag: E2E_ENV.seedTag },
    });
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, agency_id: agencyId, name, e2e_tag: E2E_ENV.seedTag },
    });
    if (error || !created?.user) throw new Error(`createUser failed: ${error?.message}`);
    userId = created.user.id;
  }

  // Mirror profile row (some flows rely on it existing)
  await (admin.from("users") as any).upsert(
    { id: userId, email, name: name ?? null, role, agency_id: agencyId ?? null },
    { onConflict: "id" }
  );

  return { id: userId, email, password, role, agencyId };
}

// Mint a session via the public Supabase REST endpoint (the SDK call is fine too,
// but doing it raw keeps the cookie/storage shape identical to what the frontend produces).
export async function mintSession(email: string, password: string) {
  const url = `${E2E_ENV.supabaseUrl}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: E2E_ENV.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`mintSession failed (${res.status}): ${body}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: { id: string; email: string };
  };
}

// Inject the session into the page's localStorage so the SPA boots as the user.
// Skips the email/password login UI entirely.
export async function loginAs(page: Page, user: SeededUser) {
  const session = await mintSession(user.email, user.password);
  const storageKey = getSupabaseStorageKey();
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  };

  // Must navigate to the app origin before touching localStorage
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [storageKey, JSON.stringify(payload)] as const
  );
  return session;
}
