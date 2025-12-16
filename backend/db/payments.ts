// @ts-nocheck
// Payment database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Payment, InsertPayment } from "./types";

export async function createPayment(payment: InsertPayment): Promise<string> {
  const { data, error } = await supabase
    .from("payments")
    .insert(payment)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getPaymentsByContractId(contractId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("contract_id", contractId)
    .order("due_date", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updatePayment(id: string, data: Partial<InsertPayment>): Promise<void> {
  const { error } = await supabase.from("payments").update(data).eq("id", id);

  if (error) throw error;
}

// Admin functions
export async function getAllPayments(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      contracts(contract_number),
      companies(company_name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get payments:", error);
    return [];
  }

  return data || [];
}

export async function updatePaymentStatus(id: string, status: string): Promise<void> {
  const updates: any = { status };

  if (status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin.from("payments").update(updates).eq("id", id);

  if (error) {
    console.error("[Database] Failed to update payment status:", error);
    throw error;
  }
}

/**
 * Confirm a payment has been made
 * Verifies company ownership and updates payment status to paid
 * If this is a batch payment, the database trigger will automatically unlock the batch
 */
export async function confirmPaymentMade(paymentId: string, companyId: string): Promise<void> {
  // First verify this payment belongs to the company
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, company_id, status, batch_id")
    .eq("id", paymentId)
    .single();

  if (fetchError) {
    console.error("[Database] Failed to fetch payment:", fetchError);
    throw fetchError;
  }

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.company_id !== companyId) {
    throw new Error("Payment does not belong to this company");
  }

  if (payment.status === "paid") {
    // Already paid, no action needed
    return;
  }

  // Update payment status to paid
  // This will trigger the unlock_batch_on_payment trigger if it's a batch payment
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) {
    console.error("[Database] Failed to confirm payment:", error);
    throw error;
  }

  console.log(`[Database] Payment ${paymentId} confirmed as paid`);
  if (payment.batch_id) {
    console.log(`[Database] Batch ${payment.batch_id} will be automatically unlocked by trigger`);
  }
}
