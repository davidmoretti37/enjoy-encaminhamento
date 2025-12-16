// @ts-nocheck
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
export type School = Database["public"]["Tables"]["schools"]["Row"];
export type InsertSchool = Database["public"]["Tables"]["schools"]["Insert"];
export type JobMatch = Database["public"]["Tables"]["job_matches"]["Row"];
export type InsertJobMatch = Database["public"]["Tables"]["job_matches"]["Insert"];

// Batch types (candidate pre-selection)
export type CandidateBatch = Database["public"]["Tables"]["candidate_batches"]["Row"];
export type InsertCandidateBatch = Database["public"]["Tables"]["candidate_batches"]["Insert"];
export type SchoolEmployeeTypeSetting = Database["public"]["Tables"]["school_employee_type_settings"]["Row"];
export type InsertSchoolEmployeeTypeSetting = Database["public"]["Tables"]["school_employee_type_settings"]["Insert"];

// Re-export Database type for modules that need it
export type { Database };
