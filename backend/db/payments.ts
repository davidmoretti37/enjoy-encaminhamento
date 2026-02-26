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
  const { error } = await supabaseAdmin.from("payments").update(data).eq("id", id);

  if (error) throw error;
}

export async function getPaymentById(paymentId: string, companyId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();

  if (error) return null;
  return data;
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

// ============================================
// Company payment functions
// ============================================

export async function getCompanyPaymentStats(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

  const { data: dueData } = await supabase
    .from("payments")
    .select("amount")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .gte("due_date", startOfMonth)
    .lte("due_date", endOfMonth);

  const { data: overdueData } = await supabase
    .from("payments")
    .select("amount")
    .eq("company_id", companyId)
    .eq("status", "overdue");

  const { data: paidData } = await supabase
    .from("payments")
    .select("amount")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .gte("paid_at", sixMonthsAgo);

  const sum = (arr: any[]) => (arr || []).reduce((s: number, p: any) => s + (p.amount || 0), 0) / 100;

  return {
    dueThisMonth: sum(dueData),
    overdue: sum(overdueData),
    paidLast6Months: sum(paidData),
  };
}

export async function getCompanyPayments(companyId: string, filter?: string) {
  let query = supabaseAdmin
    .from("payments")
    .select(`
      *,
      contract:contracts(
        id, contract_number, contract_type,
        candidate:candidates(id, full_name)
      )
    `)
    .eq("company_id", companyId);

  const now = new Date().toISOString();

  if (filter === 'overdue') {
    query = query.eq("status", "overdue").order("due_date", { ascending: true });
  } else if (filter === 'upcoming') {
    query = query.eq("status", "pending").gte("due_date", now).order("due_date", { ascending: true });
  } else if (filter === 'history') {
    query = query.eq("status", "paid").order("paid_at", { ascending: false });
  } else {
    query = query.order("due_date", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Database] Failed to get company payments:", error);
    return [];
  }
  return data || [];
}

// ============================================
// Payment generation for contracts
// ============================================

export async function generateContractPayments(contractId: string): Promise<number> {
  const { data: contract, error } = await supabaseAdmin
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    console.error("[Database] Failed to fetch contract for payment generation:", error);
    throw new Error("Contract not found");
  }

  // Check if payments already exist for this contract
  const { count: existingCount } = await supabaseAdmin
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("contract_id", contractId);

  if (existingCount && existingCount > 0) {
    console.log(`[Database] Payments already exist for contract ${contractId}, skipping generation`);
    return 0;
  }

  const payments: any[] = [];

  // Insurance fee (estágio only)
  if (contract.contract_type === 'estagio' && contract.insurance_fee > 0) {
    payments.push({
      contract_id: contractId,
      company_id: contract.company_id,
      amount: contract.insurance_fee,
      payment_type: 'insurance-fee',
      due_date: contract.start_date,
      status: 'pending',
      billing_period: null,
    });
  }

  // Monthly fee payments
  const monthlyFee = contract.monthly_fee;
  if (monthlyFee <= 0) {
    // No monthly fee, just insert insurance if any
    if (payments.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("payments").insert(payments);
      if (insertError) throw insertError;
    }
    return payments.length;
  }

  const startDate = new Date(contract.start_date);
  const endDate = contract.end_date ? new Date(contract.end_date) : null;
  const paymentDay = contract.payment_day || startDate.getDate();

  // Calculate first payment date
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), paymentDay);
  if (current < startDate) {
    current.setMonth(current.getMonth() + 1);
  }

  // Max months: from contract duration or default 12
  const maxMonths = endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) + 1
    : 12;

  let count = 0;
  while (count < maxMonths) {
    if (endDate && current > endDate) break;

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');

    payments.push({
      contract_id: contractId,
      company_id: contract.company_id,
      amount: monthlyFee,
      payment_type: 'monthly-fee',
      due_date: current.toISOString(),
      status: 'pending',
      billing_period: `${year}-${month}`,
    });

    current = new Date(current.getFullYear(), current.getMonth() + 1, paymentDay);
    count++;
  }

  if (payments.length > 0) {
    const { error: insertError } = await supabaseAdmin.from("payments").insert(payments);
    if (insertError) {
      console.error("[Database] Failed to generate payments:", insertError);
      throw insertError;
    }
  }

  console.log(`[Database] Generated ${payments.length} payments for contract ${contractId}`);
  return payments.length;
}

// ============================================
// Owner/admin payment alert functions
// ============================================

export async function getPaymentAlertCounts(): Promise<{
  upcoming: number;
  overdue: number;
  pendingReview: number;
  total: number;
}> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: upcoming } = await supabaseAdmin
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("due_date", sevenDaysFromNow)
    .gte("due_date", now.toISOString());

  const { count: overdue } = await supabaseAdmin
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "overdue");

  const { count: pendingReview } = await supabaseAdmin
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("receipt_status", "pending-review");

  const u = upcoming || 0;
  const o = overdue || 0;
  const p = pendingReview || 0;

  return {
    upcoming: u,
    overdue: o,
    pendingReview: p,
    total: u + o + p,
  };
}

// Agency-scoped version of getPaymentAlertCounts
export async function getPaymentAlertCountsByAgency(agencyId: string): Promise<{
  upcoming: number;
  overdue: number;
  pendingReview: number;
  total: number;
}> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: upcoming } = await supabaseAdmin
    .from("payments")
    .select("*, companies!inner(agency_id)", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("companies.agency_id", agencyId)
    .lte("due_date", sevenDaysFromNow)
    .gte("due_date", now.toISOString());

  const { count: overdue } = await supabaseAdmin
    .from("payments")
    .select("*, companies!inner(agency_id)", { count: "exact", head: true })
    .eq("status", "overdue")
    .eq("companies.agency_id", agencyId);

  const { count: pendingReview } = await supabaseAdmin
    .from("payments")
    .select("*, companies!inner(agency_id)", { count: "exact", head: true })
    .eq("receipt_status", "pending-review")
    .eq("companies.agency_id", agencyId);

  const u = upcoming || 0;
  const o = overdue || 0;
  const p = pendingReview || 0;

  return {
    upcoming: u,
    overdue: o,
    pendingReview: p,
    total: u + o + p,
  };
}

// Agency-scoped version of getPaymentsPendingReview
export async function getPaymentsPendingReviewByAgency(agencyId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      contracts(contract_number, contract_type, candidate_id,
        candidate:candidates(id, full_name)
      ),
      companies!inner(company_name, email, agency_id)
    `)
    .eq("receipt_status", "pending-review")
    .eq("companies.agency_id", agencyId)
    .order("receipt_uploaded_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get agency pending review payments:", error);
    return [];
  }
  return data || [];
}

// ============================================
// Agency payment tracking (per-company breakdown)
// ============================================

export async function getPaymentsGroupedByCompany(agencyId: string) {
  // Get all payments for companies belonging to this agency
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      companies!inner(id, company_name, agency_id)
    `)
    .eq("companies.agency_id", agencyId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get payments grouped by company:", error);
    return [];
  }

  // Group by company
  const grouped: Record<string, {
    companyId: string;
    companyName: string;
    totalDue: number;
    totalPaid: number;
    overdueCount: number;
    overdueAmount: number;
    pendingCount: number;
    pendingAmount: number;
    nextPaymentDate: string | null;
    payments: any[];
  }> = {};

  const now = new Date();

  for (const payment of data || []) {
    const companyId = payment.companies?.id;
    const companyName = payment.companies?.company_name || "N/A";

    if (!companyId) continue;

    if (!grouped[companyId]) {
      grouped[companyId] = {
        companyId,
        companyName,
        totalDue: 0,
        totalPaid: 0,
        overdueCount: 0,
        overdueAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        nextPaymentDate: null,
        payments: [],
      };
    }

    const g = grouped[companyId];
    g.payments.push(payment);

    if (payment.status === "paid") {
      g.totalPaid += payment.amount || 0;
    } else if (payment.status === "overdue") {
      g.overdueCount++;
      g.overdueAmount += payment.amount || 0;
      g.totalDue += payment.amount || 0;
    } else if (payment.status === "pending") {
      g.pendingCount++;
      g.pendingAmount += payment.amount || 0;
      g.totalDue += payment.amount || 0;

      // Track next payment date (earliest pending)
      if (payment.due_date && (!g.nextPaymentDate || payment.due_date < g.nextPaymentDate)) {
        g.nextPaymentDate = payment.due_date;
      }
    }
  }

  return Object.values(grouped).sort((a, b) => {
    // Sort: overdue first, then by next payment date
    if (a.overdueCount > 0 && b.overdueCount === 0) return -1;
    if (b.overdueCount > 0 && a.overdueCount === 0) return 1;
    if (a.nextPaymentDate && b.nextPaymentDate) return a.nextPaymentDate.localeCompare(b.nextPaymentDate);
    return 0;
  });
}

export async function getOverduePayments(agencyId: string) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      companies!inner(id, company_name, agency_id)
    `)
    .eq("companies.agency_id", agencyId)
    .eq("status", "overdue")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get overdue payments:", error);
    return [];
  }

  return data || [];
}

export async function getPaymentsPendingReview(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      contracts(contract_number, contract_type, candidate_id,
        candidate:candidates(id, full_name)
      ),
      companies(company_name, email)
    `)
    .eq("receipt_status", "pending-review")
    .order("receipt_uploaded_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get pending review payments:", error);
    return [];
  }
  return data || [];
}
