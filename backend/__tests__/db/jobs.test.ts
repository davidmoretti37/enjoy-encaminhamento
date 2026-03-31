import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin and supabase before importing the module under test
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };

  return {
    supabase: { from: vi.fn(() => mockChain) },
    supabaseAdmin: { from: vi.fn(() => mockChain) },
  };
});

// Mock AI/matching services to prevent import errors
vi.mock("../../services/ai/summarizer", () => ({
  generateJobSummary: vi.fn(),
}));
vi.mock("../../services/matching", () => ({
  generateJobEmbedding: vi.fn(),
}));

describe("getJobById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('jobs'), .select('*'), .eq('id', ...), .single()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockJob = { id: "job-1", title: "Dev", status: "open" };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getJobById } = await import("../../db/jobs");
    const result = await getJobById("job-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("jobs");
    expect(mockChain.eq).toHaveBeenCalledWith("id", "job-1");
    expect(mockChain.single).toHaveBeenCalled();
    expect(result).toEqual(mockJob);
  });
});

describe("getJobsByCompanyId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('jobs'), .eq('company_id', ...), .order()", async () => {
    const { supabase } = await import("../../supabase");

    const mockJobs = [{ id: "job-1", company_id: "comp-1" }];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { getJobsByCompanyId } = await import("../../db/jobs");
    const result = await getJobsByCompanyId("comp-1");

    expect(supabase.from).toHaveBeenCalledWith("jobs");
    expect(mockChain.eq).toHaveBeenCalledWith("company_id", "comp-1");
    expect(result).toEqual(mockJobs);
  });
});

describe("getAllOpenJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('jobs'), .eq('status', 'open'), .order()", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockJobs = [{ id: "job-1", status: "open" }];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getAllOpenJobs } = await import("../../db/jobs");
    const result = await getAllOpenJobs();

    expect(supabaseAdmin.from).toHaveBeenCalledWith("jobs");
    expect(mockChain.eq).toHaveBeenCalledWith("status", "open");
    expect(result).toEqual(mockJobs);
  });
});

describe("updateJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls .from('jobs'), .update(), .eq('id', ...)", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { updateJob } = await import("../../db/jobs");
    await updateJob("job-1", { title: "Updated Title" });

    expect(supabaseAdmin.from).toHaveBeenCalledWith("jobs");
    expect(mockChain.update).toHaveBeenCalledWith({ title: "Updated Title" });
    expect(mockChain.eq).toHaveBeenCalledWith("id", "job-1");
  });

  it("throws when update fails", async () => {
    const { supabaseAdmin } = await import("../../supabase");

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { updateJob } = await import("../../db/jobs");
    await expect(updateJob("job-1", { title: "Fail" })).rejects.toThrow();
  });
});
