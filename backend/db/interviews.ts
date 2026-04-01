// Interview scheduling database operations
import { supabaseAdmin } from "../supabase";
import type {
  InterviewSession,
  InsertInterviewSession,
  InterviewParticipant,
  InsertInterviewParticipant
} from "./types";

// Cast to any to work around TS 5.9 overload resolution issues with Supabase client
const db = supabaseAdmin as any;

// ============================================
// INTERVIEW SESSIONS
// ============================================

/**
 * Create an interview session with participants
 * Used when company schedules interviews for selected candidates
 */
export async function createInterviewSession(params: {
  batchId?: string;
  jobId: string;
  companyId: string;
  interviewType: "online" | "in_person";
  interviewStage?: "pre_selection" | "company_interview";
  scheduledAt: string;
  durationMinutes?: number;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationNotes?: string;
  meetingLink?: string;
  notes?: string;
  candidateApplications: Array<{ candidateId: string; applicationId: string }>;
}): Promise<InterviewSession> {
  // Create the session
  const { data: session, error: sessionError } = await db
    .from("interview_sessions")
    .insert({
      batch_id: params.batchId,
      job_id: params.jobId,
      company_id: params.companyId,
      interview_type: params.interviewType,
      interview_stage: params.interviewStage || "pre_selection",
      scheduled_at: params.scheduledAt,
      duration_minutes: params.durationMinutes || 30,
      location_address: params.locationAddress,
      location_city: params.locationCity,
      location_state: params.locationState,
      location_notes: params.locationNotes,
      meeting_link: params.meetingLink,
      notes: params.notes,
      status: "scheduled",
    })
    .select()
    .single();

  if (sessionError) {
    console.error("[Database] Failed to create interview session:", sessionError);
    throw sessionError;
  }

  // Create participants
  const participants = params.candidateApplications.map((ca) => ({
    interview_session_id: session.id,
    candidate_id: ca.candidateId,
    application_id: ca.applicationId,
    status: "pending" as const,
  }));

  const { error: participantsError } = await db
    .from("interview_participants")
    .insert(participants);

  if (participantsError) {
    console.error("[Database] Failed to create interview participants:", participantsError);
    // Rollback session if participants fail
    await db.from("interview_sessions").delete().eq("id", session.id);
    throw participantsError;
  }

  return session;
}

/**
 * Create an interview session for pre-selection (agency-side)
 * Supports nullable application_id and session_format field
 */
export async function createPreSelectionSession(params: {
  batchId: string;
  jobId: string;
  companyId: string;
  interviewType: "online" | "in_person";
  sessionFormat: "group" | "individual";
  interviewStage?: "pre_selection" | "company_interview";
  scheduledAt: string;
  durationMinutes?: number;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  meetingLink?: string;
  notes?: string;
  candidates: Array<{ candidateId: string; applicationId: string | null }>;
}): Promise<InterviewSession> {
  const { data: session, error: sessionError } = await db
    .from("interview_sessions")
    .insert({
      batch_id: params.batchId,
      job_id: params.jobId,
      company_id: params.companyId,
      interview_type: params.interviewType,
      session_format: params.sessionFormat,
      interview_stage: params.interviewStage || "pre_selection",
      scheduled_at: params.scheduledAt,
      duration_minutes: params.durationMinutes || 30,
      location_address: params.locationAddress,
      location_city: params.locationCity,
      location_state: params.locationState,
      meeting_link: params.meetingLink,
      notes: params.notes,
      status: "scheduled",
    })
    .select()
    .single();

  if (sessionError) {
    console.error("[Database] Failed to create pre-selection session:", sessionError);
    throw sessionError;
  }

  const participants = params.candidates.map((ca) => ({
    interview_session_id: session.id,
    candidate_id: ca.candidateId,
    application_id: ca.applicationId,
    status: "pending" as const,
  }));

  const { error: participantsError } = await db
    .from("interview_participants")
    .insert(participants);

  if (participantsError) {
    console.error("[Database] Failed to create pre-selection participants:", participantsError);
    await db.from("interview_sessions").delete().eq("id", session.id);
    throw participantsError;
  }

  return session;
}

/**
 * Get interview session by ID with full details
 */
export async function getInterviewSessionById(sessionId: string): Promise<any | null> {
  const { data, error } = await db
    .from("interview_sessions")
    .select(`
      *,
      job:jobs(id, title, contract_type),
      company:companies(id, company_name, email),
      participants:interview_participants(
        *,
        candidate:candidates(id, user_id, full_name, email, phone)
      )
    `)
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get interview session:", error);
    throw error;
  }

  return data;
}

/**
 * Get interview sessions for a company
 */
export async function getInterviewSessionsByCompany(
  companyId: string,
  status?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("interview_sessions")
    .select(`
      *,
      job:jobs(id, title, contract_type),
      participants:interview_participants(
        *,
        candidate:candidates(id, full_name, email)
      )
    `)
    .eq("company_id", companyId)
    .eq("interview_stage", "company_interview")
    .order("scheduled_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Failed to get company interview sessions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get interviews for a candidate
 * Returns pending, confirmed, and recent completed interviews
 */
export async function getInterviewsByCandidate(candidateId: string): Promise<any[]> {
  const { data, error } = await db
    .from("interview_participants")
    .select(`
      *,
      session:interview_sessions(
        *,
        job:jobs(id, title, contract_type),
        company:companies(id, company_name, address, city, state)
      )
    `)
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get candidate interviews:", error);
    return [];
  }

  // Filter out pre-selection sessions — only return company interviews
  return (data || []).filter((p: any) => p.session?.interview_stage === "company_interview");
}

/**
 * Update interview session
 */
export async function updateInterviewSession(
  sessionId: string,
  updates: Partial<InsertInterviewSession>
): Promise<void> {
  const { error } = await db
    .from("interview_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) {
    console.error("[Database] Failed to update interview session:", error);
    throw error;
  }
}

/**
 * Cancel an interview session
 */
export async function cancelInterviewSession(sessionId: string): Promise<void> {
  await updateInterviewSession(sessionId, { status: "cancelled" });
}

// ============================================
// INTERVIEW PARTICIPANTS
// ============================================

/**
 * Get participant by ID
 */
export async function getParticipantById(participantId: string): Promise<any | null> {
  const { data, error } = await db
    .from("interview_participants")
    .select(`
      *,
      session:interview_sessions(
        *,
        job:jobs(id, title),
        company:companies(id, company_name, email)
      ),
      candidate:candidates(id, user_id, full_name, email)
    `)
    .eq("id", participantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get participant:", error);
    throw error;
  }

  return data;
}

/**
 * Update participant status
 */
export async function updateParticipantStatus(
  participantId: string,
  status: "pending" | "confirmed" | "reschedule_requested" | "declined" | "no_show" | "attended",
  rescheduleReason?: string
): Promise<void> {
  const updates: Partial<InsertInterviewParticipant> = {
    status,
    responded_at: new Date().toISOString(),
  };

  if (rescheduleReason) {
    updates.reschedule_reason = rescheduleReason;
  }

  const { error } = await db
    .from("interview_participants")
    .update(updates)
    .eq("id", participantId);

  if (error) {
    console.error("[Database] Failed to update participant status:", error);
    throw error;
  }
}

/**
 * Get participant by candidate and session
 */
export async function getParticipantByCandidateAndSession(
  candidateId: string,
  sessionId: string
): Promise<InterviewParticipant | null> {
  const { data, error } = await db
    .from("interview_participants")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("interview_session_id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get participant:", error);
    throw error;
  }

  return data;
}

/**
 * Get all interview sessions for a batch with participants
 * Used by agencies to see per-candidate meeting assignments
 */
export async function getInterviewSessionsByBatch(batchId: string): Promise<any[]> {
  const { data, error } = await db
    .from("interview_sessions")
    .select(`
      *,
      participants:interview_participants(
        *,
        candidate:candidates(id, full_name, email, phone)
      )
    `)
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get batch interview sessions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all participants for a session
 */
export async function getSessionParticipants(sessionId: string): Promise<any[]> {
  const { data, error } = await db
    .from("interview_participants")
    .select(`
      *,
      candidate:candidates(id, full_name, email, phone)
    `)
    .eq("interview_session_id", sessionId);

  if (error) {
    console.error("[Database] Failed to get session participants:", error);
    return [];
  }

  return data || [];
}

/**
 * Get company-interview sessions for a batch (interview_stage = 'company_interview')
 * Used to retrieve the interviews the agency scheduled between company and candidates
 */
export async function getCompanyInterviewSessionsByBatch(batchId: string): Promise<any[]> {
  const { data, error } = await db
    .from("interview_sessions")
    .select(`
      *,
      participants:interview_participants(
        *,
        candidate:candidates(id, full_name, email, phone)
      )
    `)
    .eq("batch_id", batchId)
    .eq("interview_stage", "company_interview")
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get company interview sessions:", error);
    return [];
  }

  return data || [];
}

export async function markSessionAttendance(
  sessionId: string,
  attendance: Array<{ participantId: string; status: "attended" | "no_show" }>
): Promise<void> {
  for (const entry of attendance) {
    const { error } = await db
      .from("interview_participants")
      .update({ status: entry.status })
      .eq("id", entry.participantId)
      .eq("interview_session_id", sessionId);

    if (error) {
      console.error("[Database] Failed to update participant attendance:", error);
    }
  }

  // Mark session as completed
  await db
    .from("interview_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
}
