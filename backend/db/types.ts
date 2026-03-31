// Shared database types for all db modules
import type { Database } from "../types/database";

// Core entity types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type InsertUser = Database["public"]["Tables"]["users"]["Insert"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type InsertCompany = Database["public"]["Tables"]["companies"]["Insert"];
export type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
export type InsertCandidate = Database["public"]["Tables"]["candidates"]["Insert"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type InsertJob = Database["public"]["Tables"]["jobs"]["Insert"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type InsertApplication = Database["public"]["Tables"]["applications"]["Insert"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type InsertContract = Database["public"]["Tables"]["contracts"]["Insert"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type InsertFeedback = Database["public"]["Tables"]["feedback"]["Insert"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type InsertPayment = Database["public"]["Tables"]["payments"]["Insert"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type InsertDocument = Database["public"]["Tables"]["documents"]["Insert"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type InsertNotification = Database["public"]["Tables"]["notifications"]["Insert"];
export type Agency = Database["public"]["Tables"]["agencies"]["Row"];
export type InsertAgency = Database["public"]["Tables"]["agencies"]["Insert"];
export type JobMatch = Database["public"]["Tables"]["job_matches"]["Row"];
export type InsertJobMatch = Database["public"]["Tables"]["job_matches"]["Insert"];

// Batch types (candidate pre-selection)
// NOTE: These tables were added after the Supabase types were generated.
// Define manually until database.ts is regenerated.
export type CandidateBatch = {
  id: string;
  job_id: string;
  agency_id: string | null;
  company_id: string | null;
  candidate_ids: string[];
  batch_size: number;
  unlock_fee: number;
  status: string;
  payment_status: string;
  unlocked: boolean;
  meeting_scheduled_at: string | null;
  meeting_link: string | null;
  meeting_notes: string | null;
  created_at: string;
  updated_at: string | null;
};
export type InsertCandidateBatch = Partial<CandidateBatch> & { job_id: string; candidate_ids: string[] };

export type AgencyEmployeeTypeSetting = {
  id: string;
  agency_id: string;
  employee_type: string;
  monthly_fee: number;
  first_intern_discount: number | null;
  setup_fee: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};
export type InsertAgencyEmployeeTypeSetting = Partial<AgencyEmployeeTypeSetting> & { agency_id: string; employee_type: string };

// Interview types
export type InterviewSession = Database["public"]["Tables"]["interview_sessions"]["Row"];
export type InsertInterviewSession = Database["public"]["Tables"]["interview_sessions"]["Insert"];
export type InterviewParticipant = Database["public"]["Tables"]["interview_participants"]["Row"];
export type InsertInterviewParticipant = Database["public"]["Tables"]["interview_participants"]["Insert"];

// Re-export Database type for modules that need it
export type { Database };
