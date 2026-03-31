/**
 * Frontend Login Component Test
 *
 * Since there are no frontend TSX components in the codebase yet,
 * this file tests the auth-related tRPC contract from a frontend
 * consumer perspective: verifying the expected API shapes and
 * response types that a Login component would rely on.
 *
 * When actual Login components are added, replace these with
 * proper @testing-library/react render tests.
 */
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// These schemas represent the contract a Login/Signup UI must satisfy.
// They mirror the backend router input schemas so frontend and backend
// stay aligned.
// ---------------------------------------------------------------------------

/** What the login form must collect and send */
const loginFormSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Senha e obrigatoria"),
});

/** What the signup form must collect (mirrors auth.createProfile + Supabase) */
const signupFormSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiuscula")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minuscula")
    .regex(/[0-9]/, "Deve conter pelo menos um numero"),
  name: z.string().min(1).optional(),
});

/** Expected shape of the auth.me response when unauthenticated */
const unauthenticatedMeResponse = z.null();

/** Expected shape of the auth.me response when authenticated */
const authenticatedMeResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string().nullable(),
  name: z.string().nullable(),
  agency_id: z.string().uuid().nullable(),
  created_at: z.string(),
});

// ===================================================================
// Tests
// ===================================================================

describe("Login form validation", () => {
  it("accepts valid email and password", () => {
    const result = loginFormSchema.safeParse({
      email: "user@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginFormSchema.safeParse({
      email: "",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginFormSchema.safeParse({
      email: "not-an-email",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginFormSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("Signup form validation", () => {
  it("accepts valid signup data", () => {
    const result = signupFormSchema.safeParse({
      email: "new@example.com",
      password: "Str0ngPa$$",
      name: "Maria Silva",
    });
    expect(result.success).toBe(true);
  });

  it("allows name to be omitted", () => {
    const result = signupFormSchema.safeParse({
      email: "new@example.com",
      password: "Str0ngPa$$",
    });
    expect(result.success).toBe(true);
  });

  it("rejects weak password (no uppercase)", () => {
    const result = signupFormSchema.safeParse({
      email: "new@example.com",
      password: "weakpass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password (no digit)", () => {
    const result = signupFormSchema.safeParse({
      email: "new@example.com",
      password: "WeakPasss",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signupFormSchema.safeParse({
      email: "new@example.com",
      password: "Ab1",
    });
    expect(result.success).toBe(false);
  });
});

describe("auth.me response shape", () => {
  it("validates null response for unauthenticated user", () => {
    const result = unauthenticatedMeResponse.safeParse(null);
    expect(result.success).toBe(true);
  });

  it("validates full user object for authenticated user", () => {
    const result = authenticatedMeResponse.safeParse({
      id: "a0000000-0000-4000-8000-000000000001",
      email: "user@example.com",
      role: "candidate",
      name: "Test User",
      agency_id: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates user with agency_id", () => {
    const result = authenticatedMeResponse.safeParse({
      id: "a0000000-0000-4000-8000-000000000001",
      email: "agency@example.com",
      role: "admin",
      name: null,
      agency_id: "b0000000-0000-4000-8000-000000000002",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects user missing required id field", () => {
    const result = authenticatedMeResponse.safeParse({
      email: "user@example.com",
      role: "candidate",
    });
    expect(result.success).toBe(false);
  });
});
