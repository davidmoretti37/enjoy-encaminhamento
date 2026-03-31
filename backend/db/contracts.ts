// Contract database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Contract, InsertContract } from "./types";

export async function createContract(contract: InsertContract): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("contracts")
    .insert(contract)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getContractsByCompanyId(companyId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getContractsByCandidateId(candidateId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllActiveContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateContract(id: string, data: Partial<InsertContract>): Promise<void> {
  const { error } = await (supabase as any).from("contracts").update(data).eq("id", id);

  if (error) throw error;
}

export async function getContractWithDetails(contractId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select(`
      *,
      candidates (
        id,
        full_name,
        email,
        phone
      ),
      companies (
        id,
        company_name,
        email
      ),
      jobs (
        id,
        title
      )
    `)
    .eq("id", contractId)
    .single();

  if (error) {
    console.error("[Database] Failed to get contract details:", error);
    return null;
  }

  return data;
}
