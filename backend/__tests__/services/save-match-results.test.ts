// saveMatchResults — specifically the jobs.last_matched_at stamp.
//
// The stamp is what the vaga screen uses to say "this search already ran".
// Getting it wrong in the optimistic direction is the dangerous case: the
// job_matches upsert errors are logged and swallowed, so a run that found 48
// candidates and failed to persist a single one would still be stamped, and the
// UI would then state — with a timestamp, confidently — that the vaga has no
// compatible candidates. Better to leave it unstamped and let the operator
// search again.
import { describe, it, expect, vi, beforeEach } from "vitest";

const upsert = vi.fn();
const update = vi.fn();
const eq = vi.fn();

vi.mock("../../supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "jobs") return { update: (...a: any[]) => update(...a) };
      return { upsert: (...a: any[]) => upsert(...a) };
    }),
  },
  withRetry: vi.fn((fn: any) => fn()),
}));

vi.mock("../../services/ai/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(null),
  generateEmbeddings: vi.fn().mockResolvedValue([]),
  embeddingsAvailable: vi.fn().mockReturnValue(false),
  formatEmbeddingForPostgres: vi.fn(),
}));

import { saveMatchResults } from "../../services/matching/index";

const JOB = "11111111-1111-1111-1111-111111111111";

function result(candidateId: string) {
  return {
    candidateId,
    compositeScore: 80,
    factors: {
      semantic: 0, skills: 0, location: 0, education: 0, experience: 0,
      contract: 0, personality: 0, history: 0, bidirectional: 0, competency: 0,
    },
    explanation: { strengths: [], opportunities: [], concerns: [], summary: null, dataCompleteness: null },
    llmResult: null,
    applied: false,
  } as any;
}

describe("saveMatchResults — last_matched_at stamp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
    update.mockReturnValue({ eq: (...a: any[]) => { eq(...a); return Promise.resolve({ error: null }); } });
  });

  it("stamps the job after a successful save", async () => {
    await saveMatchResults(JOB, [result("c1")], "balanced");

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toHaveProperty("last_matched_at");
    expect(eq).toHaveBeenCalledWith("id", JOB);
  });

  it("stamps the job when the search legitimately found nobody", async () => {
    // Zero results is a real answer, not a failure — it must be recorded, or
    // the vaga reads as "never searched" forever.
    await saveMatchResults(JOB, [], "balanced");

    expect(update).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does NOT stamp the job when an upsert failed", async () => {
    upsert.mockResolvedValue({ error: { message: "deadlock detected" } });

    await saveMatchResults(JOB, [result("c1")], "balanced");

    expect(update).not.toHaveBeenCalled();
  });

  it("does NOT stamp when only one batch of several failed", async () => {
    // Partial persistence is still an incomplete result set.
    const many = Array.from({ length: 120 }, (_, i) => result(`c${i}`));
    upsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "timeout" } })
      .mockResolvedValueOnce({ error: null });

    await saveMatchResults(JOB, many, "balanced");

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(update).not.toHaveBeenCalled();
  });
});
