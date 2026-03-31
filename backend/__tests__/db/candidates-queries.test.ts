import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing the module under test
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };

  return {
    supabase: { from: vi.fn(() => mockChain) },
    supabaseAdmin: { from: vi.fn(() => mockChain) },
  };
});

// Mock AI/matching services to prevent import errors
vi.mock("../../services/ai/summarizer", () => ({
  generateCandidateSummary: vi.fn(),
}));
vi.mock("../../services/matching", () => ({
  generateCandidateEmbedding: vi.fn(),
}));

describe("createCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('candidates'), .insert(), .select('id'), .single()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "cand-1" },
        error: null,
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createCandidate } = await import("../../db/candidates");
    const candidateData = {
      user_id: "user-1",
      full_name: "Maria Silva",
      cpf: "12345678901",
      email: "maria@test.com",
    } as any;

    const result = await createCandidate(candidateData);

    expect(supabaseAdmin.from).toHaveBeenCalledWith("candidates");
    expect(mockChain.insert).toHaveBeenCalledWith(candidateData);
    expect(mockChain.select).toHaveBeenCalledWith("id");
    expect(mockChain.single).toHaveBeenCalled();
    expect(result).toBe("cand-1");
  });

  it("throws when insert fails", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "duplicate key" },
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createCandidate } = await import("../../db/candidates");
    await expect(createCandidate({ user_id: "u1" } as any)).rejects.toThrow();
  });
});

describe("getCandidateByUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('candidates'), .eq('user_id', ...), .single()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockCandidate = { id: "cand-1", user_id: "user-1", full_name: "Maria" };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCandidate, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getCandidateByUserId } = await import("../../db/candidates");
    const result = await getCandidateByUserId("user-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("candidates");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockChain.single).toHaveBeenCalled();
    expect(result).toEqual(mockCandidate);
  });

  it("returns undefined when not found (PGRST116)", async () => {
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

    const { getCandidateByUserId } = await import("../../db/candidates");
    const result = await getCandidateByUserId("nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("updateCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('candidates'), .update(), .eq('id', ...)", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { updateCandidate } = await import("../../db/candidates");
    await updateCandidate("cand-1", { full_name: "Maria Updated" } as any);

    expect(supabaseAdmin.from).toHaveBeenCalledWith("candidates");
    expect(mockChain.update).toHaveBeenCalledWith({ full_name: "Maria Updated" });
    expect(mockChain.eq).toHaveBeenCalledWith("id", "cand-1");
  });

  it("throws when update fails", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { updateCandidate } = await import("../../db/candidates");
    await expect(
      updateCandidate("cand-1", { full_name: "Fail" } as any)
    ).rejects.toThrow();
  });
});
