import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing the module under test
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
  };

  return {
    supabase: { from: vi.fn(() => mockChain) },
    supabaseAdmin: {
      from: vi.fn(() => mockChain),
    },
  };
});

describe("getUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('users'), .select('*'), .eq('id', ...), .single()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "user-1", email: "test@test.com", role: "candidate" },
        error: null,
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getUserById } = await import("../../db/users");
    const result = await getUserById("user-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("users");
    expect(mockChain.select).toHaveBeenCalledWith("*");
    expect(mockChain.eq).toHaveBeenCalledWith("id", "user-1");
    expect(mockChain.single).toHaveBeenCalled();
    expect(result).toEqual({ id: "user-1", email: "test@test.com", role: "candidate" });
  });

  it("returns undefined when user not found (PGRST116)", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getUserById } = await import("../../db/users");
    const result = await getUserById("nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("createUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('users'), .upsert() with correct fields", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createUserProfile } = await import("../../db/users");

    const profile = {
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      role: "candidate" as const,
      agency_id: "agency-1",
    };

    const result = await createUserProfile(profile);

    expect(supabaseAdmin.from).toHaveBeenCalledWith("users");
    expect(mockChain.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        role: "candidate",
        agency_id: "agency-1",
      },
      { onConflict: "id", ignoreDuplicates: false }
    );
    expect(result).toEqual({ error: null });
  });

  it("returns error when upsert fails", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const dbError = { message: "DB error" };
    const mockChain = {
      upsert: vi.fn().mockResolvedValue({ error: dbError }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createUserProfile } = await import("../../db/users");
    const result = await createUserProfile({
      id: "user-1",
      email: "test@test.com",
      name: null,
      role: "company",
      agency_id: null,
    });

    expect(result).toEqual({ error: dbError });
  });
});
