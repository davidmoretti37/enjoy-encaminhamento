/**
 * tRPC Test Context Factory
 *
 * Creates mock contexts for testing tRPC procedures directly.
 * Each factory function returns a TrpcContext with a specific user role.
 */
import type { TrpcContext } from "../../_core/context";

type UserOverrides = Partial<TrpcContext["user"]>;

function mockReq(): any {
  return {
    headers: {},
    cookies: {},
    ip: "127.0.0.1",
  };
}

function mockRes(): any {
  return {
    clearCookie: () => {},
    cookie: () => {},
    setHeader: () => {},
    status: () => ({ json: () => {} }),
  };
}

function createContext(user: TrpcContext["user"]): TrpcContext {
  return {
    req: mockReq(),
    res: mockRes(),
    user,
  };
}

// ---- User factories ----

export function adminContext(overrides?: UserOverrides): TrpcContext {
  return createContext({
    id: "aa000000-0000-4000-8000-000000000001",
    email: "admin@test.com",
    name: "Admin User",
    role: "admin",
    agency_id: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  });
}

export function superAdminContext(overrides?: UserOverrides): TrpcContext {
  return createContext({
    id: "bb000000-0000-4000-8000-000000000005",
    email: "superadmin@test.com",
    name: "Super Admin",
    role: "super_admin",
    agency_id: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  });
}

export function candidateContext(overrides?: UserOverrides): TrpcContext {
  return createContext({
    id: "cc000000-0000-4000-8000-000000000002",
    email: "candidate@test.com",
    name: "Test Candidate",
    role: "candidate",
    agency_id: "a0000000-0000-4000-8000-000000000001",
    created_at: new Date().toISOString(),
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  });
}

export function companyContext(overrides?: UserOverrides): TrpcContext {
  return createContext({
    id: "dd000000-0000-4000-8000-000000000003",
    email: "company@test.com",
    name: "Test Company User",
    role: "company",
    agency_id: "a0000000-0000-4000-8000-000000000001",
    created_at: new Date().toISOString(),
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  });
}

export function agencyContext(overrides?: UserOverrides): TrpcContext {
  return createContext({
    id: "ee000000-0000-4000-8000-000000000004",
    email: "agency@test.com",
    name: "Test Agency User",
    role: "agency",
    agency_id: "a0000000-0000-4000-8000-000000000001",
    created_at: new Date().toISOString(),
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  });
}

export function unauthenticatedContext(): TrpcContext {
  return createContext(null);
}
