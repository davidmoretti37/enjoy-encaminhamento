import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing the module under test
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };

  return {
    supabase: { from: vi.fn(() => mockChain) },
    supabaseAdmin: {
      from: vi.fn(() => mockChain),
    },
  };
});

describe("createApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('applications'), .insert(), .select('id'), .single()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "app-1" },
        error: null,
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createApplication } = await import("../../db/applications");
    const appData = { job_id: "job-1", candidate_id: "cand-1" } as any;
    const result = await createApplication(appData);

    expect(supabaseAdmin.from).toHaveBeenCalledWith("applications");
    expect(mockChain.insert).toHaveBeenCalledWith(appData);
    expect(mockChain.select).toHaveBeenCalledWith("id");
    expect(mockChain.single).toHaveBeenCalled();
    expect(result).toBe("app-1");
  });

  it("throws when insert fails", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { createApplication } = await import("../../db/applications");
    await expect(
      createApplication({ job_id: "j1", candidate_id: "c1" } as any)
    ).rejects.toThrow();
  });
});

describe("getApplicationsByJobId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('applications'), .select(...), .eq('job_id', ...), .order()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockApps = [
      { id: "app-1", job_id: "job-1", candidate_id: "cand-1", status: "applied" },
    ];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockApps, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByJobId } = await import("../../db/applications");
    const result = await getApplicationsByJobId("job-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("applications");
    expect(mockChain.eq).toHaveBeenCalledWith("job_id", "job-1");
    expect(mockChain.order).toHaveBeenCalledWith("applied_at", { ascending: false });
    expect(result).toEqual(mockApps);
  });

  it("returns empty array on error", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "error" } }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByJobId } = await import("../../db/applications");
    const result = await getApplicationsByJobId("job-1");

    expect(result).toEqual([]);
  });
});

describe("getApplicationsByCandidateId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('applications'), .select(...), .eq('candidate_id', ...), .order()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockApps = [
      { id: "app-1", candidate_id: "cand-1", status: "applied" },
    ];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockApps, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByCandidateId } = await import("../../db/applications");
    const result = await getApplicationsByCandidateId("cand-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("applications");
    expect(mockChain.eq).toHaveBeenCalledWith("candidate_id", "cand-1");
    expect(mockChain.order).toHaveBeenCalledWith("applied_at", { ascending: false });
    expect(result).toEqual(mockApps);
  });

  it("returns empty array on error", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "err" } }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByCandidateId } = await import("../../db/applications");
    const result = await getApplicationsByCandidateId("cand-1");

    expect(result).toEqual([]);
  });
});
