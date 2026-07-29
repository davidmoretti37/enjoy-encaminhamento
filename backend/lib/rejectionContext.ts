// Works out which rejection message each candidate should receive.
//
// Two facts decide it (see backend/lib/rejectionCopy.ts):
//   1. Is the candidate an Inexxa student?  -> candidates.is_school_student
//      (populated on prod: 23 true / 251 false)
//   2. Did they actually attend a company-stage interview for THIS job?
//      -> interview_participants joined to interview_sessions where
//         interview_stage = 'company_interview' and job_id = <job>
//
// Both are resolved in ONE query per job rather than per candidate, so closing
// a vaga with dozens of applicants doesn't fan out into dozens of round trips.
import { supabaseAdmin } from "../supabase";

const db = supabaseAdmin as any;

export interface RejectionContext {
  /** candidate_id -> attended a company-stage interview for this job */
  interviewedByCandidateId: Set<string>;
  /** candidate_id -> is an Inexxa student */
  studentByCandidateId: Set<string>;
}

export async function loadRejectionContext(
  jobId: string,
  candidateIds: string[],
): Promise<RejectionContext> {
  const interviewedByCandidateId = new Set<string>();
  const studentByCandidateId = new Set<string>();

  if (candidateIds.length === 0) {
    return { interviewedByCandidateId, studentByCandidateId };
  }

  // Who is an Inexxa student?
  try {
    const { data: cands } = await db
      .from("candidates")
      .select("id, is_school_student")
      .in("id", candidateIds);
    for (const c of cands || []) {
      if (c.is_school_student) studentByCandidateId.add(c.id);
    }
  } catch (e: any) {
    // Non-fatal: everyone falls back to the external message, which is the
    // safest default (it never claims they study at Inexxa).
    console.error("[rejectionContext] failed to load student flags:", e?.message);
  }

  // Who actually sat a company interview for this job?
  try {
    const { data: sessions } = await db
      .from("interview_sessions")
      .select("id")
      .eq("job_id", jobId)
      .eq("interview_stage", "company_interview");

    const sessionIds = (sessions || []).map((s: any) => s.id);
    if (sessionIds.length > 0) {
      const { data: parts } = await db
        .from("interview_participants")
        .select("candidate_id")
        .in("interview_session_id", sessionIds)
        .in("candidate_id", candidateIds);
      for (const p of parts || []) interviewedByCandidateId.add(p.candidate_id);
    }
  } catch (e: any) {
    // Non-fatal: they're treated as not-interviewed, so the message says
    // "candidatou-se" rather than wrongly claiming they attended an interview.
    console.error("[rejectionContext] failed to load interview participation:", e?.message);
  }

  return { interviewedByCandidateId, studentByCandidateId };
}
