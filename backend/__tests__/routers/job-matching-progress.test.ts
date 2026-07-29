// getMatchingProgress — the state machine the vaga screen renders from.
//
// The old UI treated "not_started" as "a search is running", so every vaga that
// had never been searched animated as though it were searching. Fixing that put
// real weight on this endpoint reporting four states correctly, and in
// particular on it distinguishing:
//
//   never searched        -> 0 rows, no stamp  -> not_started
//   searched, found none  -> 0 rows, stamped   -> completed (matchesFound 0)
//
// Both leave job_matches empty. Only jobs.last_matched_at (migration 133) tells
// them apart, so that column is what these tests pin down.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table mock: the count query hits job_matches, the stamp lookup hits jobs.
const tables: Record<string, any> = {};

function makeChain(table: string) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => (table === "job_matches" ? Promise.resolve(tables.job_matches) : chain)),
    single: vi.fn(() => Promise.resolve(tables.jobs)),
  };
  return chain;
}

vi.mock("../../supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => makeChain(table)) },
  withRetry: vi.fn((fn: any) => fn()),
}));

vi.mock("../../db", () => ({
  getCompanyByUserId: vi.fn(),
  getJobById: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getAgencyForUserContext: vi.fn(),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateJobSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/matching", () => ({
  generateJobEmbedding: vi.fn().mockResolvedValue(null),
  findMatchingCandidates: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/matching/index", () => ({
  runMatchingPipeline: vi.fn().mockResolvedValue({ results: [], weightProfile: "balanced" }),
  saveMatchResults: vi.fn().mockResolvedValue(undefined),
}));

const getProgress = vi.fn().mockReturnValue(null);
vi.mock("../../services/matching/progress", () => ({
  getProgress: (...args: any[]) => getProgress(...args),
  failProgress: vi.fn(),
}));

import { jobRouter } from "../../routers/job";
import * as db from "../../db";
import { adminContext, candidateContext } from "../helpers/mock-context";
import { mockJob, MOCK_IDS } from "../helpers/mock-data";

const caller = (ctx: any) => jobRouter.createCaller(ctx);
const input = { jobId: MOCK_IDS.job };

describe("job.getMatchingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProgress.mockReturnValue(null);
    vi.mocked(db.getJobById).mockResolvedValue(mockJob as any);
    tables.job_matches = { count: 0, error: null };
    tables.jobs = { data: { last_matched_at: null, matching_started_at: null }, error: null };
  });

  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("reports not_started for a vaga nobody has searched", async () => {
    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("not_started");
    expect(res.matchesFound).toBe(0);
    expect(res.lastSearchedAt).toBeNull();
  });

  it("reports completed with zero matches when the search RAN and found nobody", async () => {
    // The distinction the old row-count check could not make.
    tables.job_matches = { count: 0, error: null };
    tables.jobs = { data: { last_matched_at: "2026-07-17T14:08:16.229Z" }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("completed");
    expect(res.matchesFound).toBe(0);
    expect(res.lastSearchedAt).toBe("2026-07-17T14:08:16.229Z");
  });

  it("reports completed with the match count and timestamp after a successful search", async () => {
    tables.job_matches = { count: 48, error: null };
    tables.jobs = { data: { last_matched_at: "2026-07-17T14:08:16.229Z" }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("completed");
    expect(res.matchesFound).toBe(48);
    expect(res.percentComplete).toBe(100);
  });

  it("treats pre-migration jobs with match rows but no stamp as already searched", async () => {
    // Carry-over: results predating migration 133 must not read as "never
    // searched", or the screen would offer to redo work already done.
    tables.job_matches = { count: 12, error: null };
    tables.jobs = { data: { last_matched_at: null }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("completed");
    expect(res.matchesFound).toBe(12);
    expect(res.lastSearchedAt).toBeNull();
  });

  it("reports a live run in progress, ahead of any saved state", async () => {
    getProgress.mockReturnValue({
      status: "running",
      percentComplete: 40,
      messages: [{ text: "Analisando candidatos...", timestamp: 1 }],
    });
    tables.job_matches = { count: 48, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("running");
    expect(res.percentComplete).toBe(40);
    expect(res.messages).toHaveLength(1);
  });

  // ---- regressions found in adversarial review of the funnel flattening ----

  it("does not report zero matches while a just-finished run lingers in memory", async () => {
    // completeProgress() leaves the entry at 'completed' for 60s and it carries
    // no count. Returning it verbatim made a search that had just found 48
    // people announce "found nobody" while the list below rendered all 48.
    getProgress.mockReturnValue({ status: "completed", percentComplete: 100, messages: [] });
    tables.job_matches = { count: 48, error: null };
    tables.jobs = { data: { last_matched_at: ago(1000), matching_started_at: ago(60_000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("completed");
    expect(res.matchesFound).toBe(48);
    expect(res.lastSearchedAt).not.toBeNull();
  });

  it("surfaces a failed run as failed, never as 'found nobody'", async () => {
    getProgress.mockReturnValue({
      status: "failed",
      percentComplete: 0,
      messages: [{ text: "Erro: connection reset", timestamp: 1 }],
    });
    tables.job_matches = { count: 0, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("failed");
    expect(res.messages[0].text).toContain("connection reset");
  });

  it("keeps previously saved matches visible alongside a failure", async () => {
    getProgress.mockReturnValue({ status: "failed", percentComplete: 0, messages: [] });
    tables.job_matches = { count: 12, error: null };
    tables.jobs = { data: { last_matched_at: ago(86_400_000), matching_started_at: ago(5000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("failed");
    expect(res.matchesFound).toBe(12);
  });

  it("detects a run started on another instance, so a reload does not offer to redo it", async () => {
    // In-memory progress is per-instance. Without this the panel would say
    // "esta vaga ainda não foi buscada" mid-search and invite a duplicate run.
    getProgress.mockReturnValue(null);
    tables.jobs = { data: { last_matched_at: null, matching_started_at: ago(30_000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("running");
  });

  it("gives up on a start stamp older than the stale window instead of spinning forever", async () => {
    getProgress.mockReturnValue(null);
    tables.jobs = { data: { last_matched_at: null, matching_started_at: ago(11 * 60 * 1000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("not_started");
  });

  it("prefers the in-memory failure over the in-flight marker", async () => {
    // Ordering matters: a crashed run leaves matching_started_at set until the
    // finally-block clears it, and that marker must not out-vote a known failure.
    getProgress.mockReturnValue({ status: "failed", percentComplete: 0, messages: [] });
    tables.jobs = { data: { last_matched_at: null, matching_started_at: ago(2000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("failed");
  });

  it("does not treat a start stamp older than the finish stamp as a live run", async () => {
    getProgress.mockReturnValue(null);
    tables.job_matches = { count: 5, error: null };
    tables.jobs = { data: { last_matched_at: ago(10_000), matching_started_at: ago(40_000) }, error: null };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("completed");
    expect(res.matchesFound).toBe(5);
  });

  it("does not leak match counts to a candidate", async () => {
    await expect(
      caller(candidateContext).getMatchingProgress(input),
    ).rejects.toThrow(/Acesso negado/);
  });

  it("404s on a job that does not exist", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(null as any);

    await expect(
      caller(adminContext).getMatchingProgress(input),
    ).rejects.toThrow(/não encontrada/);
  });

  it("falls back to not_started rather than throwing when the stamp lookup errors", async () => {
    tables.jobs = { data: null, error: { message: "boom" } };

    const res: any = await caller(adminContext).getMatchingProgress(input);

    expect(res.status).toBe("not_started");
  });
});
