// @ts-nocheck
// Scheduling and meeting database operations
import { supabaseAdmin } from "../supabase";

// ============ Email Outreach ============

export async function createEmailOutreach(input: {
  senderId: string;
  recipientEmail: string;
  companyId?: string;
  emailType: string;
  subject?: string;
  bodyPreview?: string;
}): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("email_outreach")
    .insert({
      sender_id: input.senderId,
      recipient_email: input.recipientEmail,
      company_id: input.companyId,
      email_type: input.emailType,
      subject: input.subject,
      body_preview: input.bodyPreview,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating email outreach:", error);
    throw error;
  }

  return data;
}

export async function getEmailOutreachHistory(
  senderId: string,
  companyId?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("email_outreach")
    .select("*")
    .eq("sender_id", senderId)
    .order("sent_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching email history:", error);
    throw error;
  }

  return data || [];
}

// ============ Company Full History ============

export async function getCompanyFullHistory(
  adminId: string,
  companyEmail: string,
  agencyId?: string
): Promise<{
  meeting: any;
  form: any;
  company: any;
  emails: any[];
  contracts: any[];
  jobs: any[];
  timeline: { date: string; event: string; type: string; details?: string }[];
  agencyContract: { type: string; pdfUrl?: string | null; html?: string | null } | null;
  phoneNumbers: { label: string; phone_number: string }[];
  companyEmails: { label: string; email: string; is_primary: boolean }[];
}> {
  let meeting = null;

  const { data: meetingByAdmin } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("admin_id", adminId)
    .eq("company_email", companyEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  meeting = meetingByAdmin;

  if (!meeting && agencyId) {
    const { data: meetingByAgency } = await supabaseAdmin
      .from("scheduled_meetings")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("company_email", companyEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    meeting = meetingByAgency;
  }

  const { data: form } = await supabaseAdmin
    .from("company_forms")
    .select("*")
    .eq("email", companyEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: emails } = await supabaseAdmin
    .from("email_outreach")
    .select("*")
    .eq("sender_id", adminId)
    .eq("recipient_email", companyEmail)
    .order("sent_at", { ascending: false });

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("email", companyEmail)
    .single();

  let contracts: any[] = [];
  let jobs: any[] = [];
  let phoneNumbers: { label: string; phone_number: string }[] = [];
  let companyEmails: { label: string; email: string; is_primary: boolean }[] = [];
  if (company?.id) {
    const { data: companyContracts } = await supabaseAdmin
      .from("contracts")
      .select(
        `
        *,
        candidate:candidates(id, full_name),
        job:jobs(id, title)
      `
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    contracts = companyContracts || [];

    const { data: companyJobs } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    jobs = companyJobs || [];

    // Fetch phone numbers for this company (ignore errors if table doesn't exist yet)
    const { data: companyPhones, error: phonesError } = await supabaseAdmin
      .from("company_phone_numbers")
      .select("label, phone_number")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });
    if (!phonesError) {
      phoneNumbers = companyPhones || [];
    }

    // Fetch emails for this company (ignore errors if table doesn't exist yet)
    const { data: companyEmailsData, error: emailsError } = await supabaseAdmin
      .from("company_emails")
      .select("label, email, is_primary")
      .eq("company_id", company.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (!emailsError) {
      companyEmails = companyEmailsData || [];
    }
  }

  const timeline: { date: string; event: string; type: string; details?: string }[] = [];

  if (meeting?.created_at) {
    timeline.push({
      date: meeting.created_at,
      event: "Reunião agendada",
      type: "meeting",
      details: meeting.scheduled_at
        ? `Para ${new Date(meeting.scheduled_at).toLocaleDateString("pt-BR")}`
        : undefined,
    });
  }

  if (meeting?.status === "completed" && meeting?.scheduled_at) {
    timeline.push({
      date: meeting.scheduled_at,
      event: "Reunião realizada",
      type: "meeting",
    });
  }

  if (form?.created_at) {
    timeline.push({
      date: form.created_at,
      event: "Formulário preenchido",
      type: "form",
      details: form.job_title ? `Vaga: ${form.job_title}` : undefined,
    });
  }

  if (meeting?.contract_sent_at) {
    timeline.push({
      date: meeting.contract_sent_at,
      event: "Contrato enviado",
      type: "contract",
    });
  }

  if (meeting?.contract_signed_at) {
    timeline.push({
      date: meeting.contract_signed_at,
      event: "Contrato assinado",
      type: "contract",
      details: meeting.contract_signer_name ? `Por: ${meeting.contract_signer_name}` : undefined,
    });
  }

  for (const email of emails || []) {
    timeline.push({
      date: email.sent_at,
      event: `Email enviado: ${email.subject || email.email_type}`,
      type: "email",
    });
  }

  for (const contract of contracts) {
    timeline.push({
      date: contract.created_at,
      event: `Contrato de trabalho: ${contract.candidate?.full_name}`,
      type: "employee_contract",
      details: contract.job?.title,
    });
  }

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let agencyContract = null;
  let agencyIdToUse = meeting?.agency_id;

  if (!agencyIdToUse) {
    agencyIdToUse = await getAdminAgencyContext(adminId);
  }

  if (agencyIdToUse) {
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("contract_type, contract_pdf_url, contract_html")
      .eq("id", agencyIdToUse)
      .single();

    if (agency?.contract_type) {
      agencyContract = {
        type: agency.contract_type,
        pdfUrl: agency.contract_pdf_url,
        html: agency.contract_html,
      };
    }
  }

  return {
    meeting,
    form,
    company,
    emails: emails || [],
    contracts,
    jobs,
    timeline,
    agencyContract,
    phoneNumbers,
    companyEmails,
  };
}

// ============ Company Forms ============

export interface CompanyFormData {
  adminId: string;
  email: string;
  contactPerson?: string;
  contactPhone?: string;
  cnpj: string;
  businessName?: string;
  legalName: string;
  landlinePhone?: string;
  mobilePhone?: string;
  website?: string;
  employeeCount?: string;
  socialMedia?: string;
  cep?: string;
  address?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  jobTitle: string;
  compensation: string;
  mainActivities: string;
  requiredSkills: string;
  employmentType?: string;
  urgency?: string;
  ageRange?: string;
  educationLevel: string;
  benefits?: string[];
  workSchedule: string;
  positionsCount?: string;
  genderPreference?: string;
  notes?: string;
}

export async function createCompanyForm(data: CompanyFormData): Promise<any> {
  const { data: result, error } = await supabaseAdmin
    .from("company_forms")
    .upsert(
      {
        admin_id: data.adminId,
        email: data.email,
        contact_person: data.contactPerson,
        contact_phone: data.contactPhone,
        cnpj: data.cnpj,
        business_name: data.businessName,
        legal_name: data.legalName,
        landline_phone: data.landlinePhone,
        mobile_phone: data.mobilePhone,
        website: data.website,
        employee_count: data.employeeCount,
        social_media: data.socialMedia,
        cep: data.cep,
        address: data.address,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        job_title: data.jobTitle,
        compensation: data.compensation,
        main_activities: data.mainActivities,
        required_skills: data.requiredSkills,
        employment_type: data.employmentType,
        urgency: data.urgency,
        age_range: data.ageRange,
        education_level: data.educationLevel,
        benefits: data.benefits,
        work_schedule: data.workSchedule,
        positions_count: data.positionsCount,
        gender_preference: data.genderPreference,
        notes: data.notes,
        status: "pending",
      },
      {
        onConflict: "admin_id,email",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error creating company form:", error);
    throw error;
  }

  return result;
}

export async function getCompanyFormByEmail(
  adminId: string,
  email: string
): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("company_forms")
    .select("*")
    .eq("admin_id", adminId)
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching company form:", error);
    throw error;
  }

  return data;
}

export async function getCompanyFormByEmailOnly(email: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("company_forms")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching company form by email:", error);
    return null;
  }

  return data;
}

export async function updateCompanyFormStatus(
  formId: string,
  status: "pending" | "accepted" | "rejected"
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("company_forms")
    .update({ status })
    .eq("id", formId);

  if (error) {
    console.error("Error updating company form status:", error);
    throw error;
  }
}

export async function deleteCompanyForm(formId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("company_forms").delete().eq("id", formId);

  if (error) {
    console.error("Error deleting company form:", error);
    throw error;
  }
}

export async function getCompanyFormsByAdmin(
  adminId: string,
  agencyId?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("company_forms")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching company forms:", error);
    throw error;
  }

  return data || [];
}

// ============ Admin Availability ============

export async function getAdminAvailability(adminId: string, agencyId?: string): Promise<any[]> {
  let query = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .order("day_of_week", { ascending: true });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching admin availability:", error);
    throw error;
  }

  return data || [];
}

export async function createAdminAvailability(input: {
  adminId: string;
  agencyId?: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  isBlocked?: boolean;
  label?: string;
}): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("admin_availability")
    .insert({
      admin_id: input.adminId,
      agency_id: input.agencyId,
      day_of_week: input.dayOfWeek,
      specific_date: input.specificDate,
      start_time: input.startTime,
      end_time: input.endTime,
      is_blocked: input.isBlocked || false,
      label: input.label,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating admin availability:", error);
    throw error;
  }

  return data;
}

export async function deleteAdminAvailability(id: string, adminId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("admin_availability")
    .delete()
    .eq("id", id)
    .eq("admin_id", adminId);

  if (error) {
    console.error("Error deleting admin availability:", error);
    throw error;
  }
}

// ============ Admin Settings ============

export async function getAdminSettings(
  adminId: string,
  agencyId?: string
): Promise<{ meeting_duration_minutes: number; agency_id?: string } | null> {
  let query = supabaseAdmin.from("admin_settings").select("*").eq("admin_id", adminId);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching admin settings:", error);
  }

  return data || null;
}

export async function saveAdminSettings(
  adminId: string,
  settings: { meeting_duration_minutes: number },
  agencyId?: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_settings").upsert({
    admin_id: adminId,
    agency_id: agencyId,
    meeting_duration_minutes: settings.meeting_duration_minutes,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving admin settings:", error);
    throw error;
  }
}

// ============ Time Blocking ============

export async function getBlockedSlots(
  adminId: string,
  date: string,
  agencyId?: string
): Promise<any[]> {
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  let query = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .eq("is_blocked", true)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching blocked slots:", error);
    throw error;
  }

  return data || [];
}

export async function blockTimeSlot(input: {
  adminId: string;
  startTime: string;
  endTime: string;
  specificDate?: string;
  dayOfWeek?: number;
  agencyId?: string;
}): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("admin_availability")
    .insert({
      admin_id: input.adminId,
      agency_id: input.agencyId || null,
      start_time: input.startTime,
      end_time: input.endTime,
      specific_date: input.specificDate || null,
      day_of_week: input.dayOfWeek ?? null,
      is_blocked: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error blocking time slot:", error);
    throw error;
  }

  return data;
}

export async function unblockTimeSlot(
  id: string,
  adminId: string,
  agencyId?: string
): Promise<void> {
  let query = supabaseAdmin
    .from("admin_availability")
    .delete()
    .eq("id", id)
    .eq("admin_id", adminId)
    .eq("is_blocked", true);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error unblocking time slot:", error);
    throw error;
  }
}

// ============ Scheduled Meetings ============

export async function getScheduledMeetings(
  adminId: string,
  status?: string,
  agencyId?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("scheduled_meetings")
    .select("*, agencies:agency_id(id, agency_name)")
    .order("scheduled_at", { ascending: true });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("user_id", adminId)
      .single();

    if (affiliate) {
      const { data: agencies } = await supabaseAdmin
        .from("agencies")
        .select("id")
        .eq("affiliate_id", affiliate.id);

      const agencyIds = agencies?.map((s) => s.id) || [];

      if (agencyIds.length > 0) {
        query = query.or(`agency_id.in.(${agencyIds.join(",")}),admin_id.eq.${adminId}`);
      } else {
        query = query.eq("admin_id", adminId);
      }
    } else {
      query = query.eq("admin_id", adminId);
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching scheduled meetings:", error);
    throw error;
  }

  return (data || []).map((meeting) => ({
    ...meeting,
    agency_name: meeting.agencies?.agency_name || null,
  }));
}

export async function createScheduledMeeting(input: {
  adminId: string;
  agencyId?: string;
  scheduledAt: string;
  companyEmail: string;
  companyName?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .insert({
      admin_id: input.adminId,
      agency_id: input.agencyId,
      scheduled_at: input.scheduledAt,
      company_email: input.companyEmail,
      company_name: input.companyName,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      notes: input.notes,
      status: "pending",
      duration_minutes: 30,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating scheduled meeting:", error);
    throw error;
  }

  return data;
}

export async function updateMeetingStatus(
  id: string,
  adminId: string,
  status: string,
  cancellationReason?: string,
  agencyId?: string
): Promise<void> {
  const updateData: any = { status };

  if (status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
    updateData.cancelled_by = "admin";
    if (cancellationReason) {
      updateData.cancellation_reason = cancellationReason;
    }
  }

  let query = supabaseAdmin.from("scheduled_meetings").update(updateData).eq("id", id);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("admin_id", adminId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating meeting status:", error);
    throw error;
  }
}

export async function getMeetingById(
  id: string,
  adminId: string,
  agencyId?: string
): Promise<any | null> {
  let query = supabaseAdmin.from("scheduled_meetings").select("*").eq("id", id);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("admin_id", adminId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching meeting:", error);
    return null;
  }

  return data;
}

export async function rescheduleMeeting(
  id: string,
  adminId: string,
  newScheduledAt: string,
  agencyId?: string
): Promise<void> {
  let query = supabaseAdmin
    .from("scheduled_meetings")
    .update({
      scheduled_at: newScheduledAt,
      status: "pending",
    })
    .eq("id", id);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("admin_id", adminId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error rescheduling meeting:", error);
    throw error;
  }
}

export async function updateMeetingLink(
  id: string,
  adminId: string,
  data: {
    meetingLink: string;
    meetingPlatform: "zoom" | "google_meet";
    meetingId: string;
  },
  agencyId?: string
): Promise<void> {
  let query = supabaseAdmin
    .from("scheduled_meetings")
    .update({
      meeting_link: data.meetingLink,
      meeting_platform: data.meetingPlatform,
      meeting_id: data.meetingId,
    })
    .eq("id", id);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("admin_id", adminId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating meeting link:", error);
    throw error;
  }
}

export async function getMeetingByToken(token: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("confirmation_token", token)
    .single();

  if (error) {
    console.error("Error fetching meeting by token:", error);
    return null;
  }

  return data;
}

export async function cancelMeetingByToken(token: string, reason?: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "company",
      cancellation_reason: reason,
    })
    .eq("confirmation_token", token);

  if (error) {
    console.error("Error cancelling meeting:", error);
    throw error;
  }
}

export async function confirmMeetingByToken(token: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update({
      status: "confirmed",
    })
    .eq("confirmation_token", token);

  if (error) {
    console.error("Error confirming meeting:", error);
    throw error;
  }
}

export async function getScheduledMeetingById(meetingId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("id", meetingId)
    .single();

  if (error) {
    console.error("Error fetching meeting by id:", error);
    return null;
  }

  return data;
}

export async function sendContractToMeeting(meetingId: string, agencyId?: string): Promise<string> {
  const contractToken = crypto.randomUUID();

  const updateData: any = {
    contract_token: contractToken,
    contract_sent_at: new Date().toISOString(),
  };

  if (agencyId) {
    updateData.agency_id = agencyId;
  }

  const { error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update(updateData)
    .eq("id", meetingId);

  if (error) {
    console.error("Error sending contract to meeting:", error);
    throw error;
  }

  return contractToken;
}

export async function getMeetingByContractToken(token: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("contract_token", token)
    .single();

  if (error) {
    console.error("Error fetching meeting by contract token:", error);
    return null;
  }

  return data;
}

export async function signMeetingContract(input: {
  contractToken: string;
  signature: string;
  signerName: string;
  signerCpf: string;
}): Promise<{ company_email: string; company_name: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update({
      contract_signature: input.signature,
      contract_signer_name: input.signerName,
      contract_signer_cpf: input.signerCpf,
      contract_signed_at: new Date().toISOString(),
    })
    .eq("contract_token", input.contractToken)
    .select("company_email, company_name")
    .single();

  if (error) {
    console.error("Error signing meeting contract:", error);
    throw error;
  }

  return { company_email: data.company_email, company_name: data.company_name };
}

// ============ Admin Agency Context ============

export async function getAdminAgencyContext(adminId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_agency_context")
    .select("current_agency_id")
    .eq("admin_id", adminId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching admin agency context:", error);
  }

  return data?.current_agency_id || null;
}

export async function setAdminAgencyContext(
  adminId: string,
  agencyId: string | null
): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_agency_context").upsert(
    {
      admin_id: adminId,
      current_agency_id: agencyId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "admin_id",
    }
  );

  if (error) {
    console.error("Error setting admin agency context:", error);
    throw error;
  }
}

export async function getAgenciesForAdmin(adminId: string, userRole: string): Promise<any[]> {
  if (userRole === "admin") {
    const { data, error } = await supabaseAdmin
      .from("agencies")
      .select("id, agency_name, city, status")
      .eq("status", "active")
      .order("agency_name", { ascending: true });

    if (error) {
      console.error("Error fetching agencies for admin:", error);
      return [];
    }

    return (data || []).map((s) => ({ id: s.id, name: s.agency_name, city: s.city }));
  }

  return [];
}

// ============ Available Slots ============

export async function getAvailableSlots(
  adminId: string,
  date: string,
  agencyId?: string
): Promise<{ start: string; end: string; blocked?: boolean }[]> {
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  const settings = await getAdminSettings(adminId, agencyId);
  const SLOT_DURATION = settings?.meeting_duration_minutes || 30;

  let availQuery = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
    .eq("is_blocked", false);
  if (agencyId) availQuery = availQuery.eq("agency_id", agencyId);
  const { data: availability, error: availError } = await availQuery;

  if (availError) {
    console.error("Error fetching availability:", availError);
    throw availError;
  }

  let blockQuery = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
    .eq("is_blocked", true);
  if (agencyId) blockQuery = blockQuery.eq("agency_id", agencyId);
  const { data: blockedSlots } = await blockQuery;

  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  let meetQuery = supabaseAdmin
    .from("scheduled_meetings")
    .select("scheduled_at, duration_minutes")
    .eq("admin_id", adminId)
    .gte("scheduled_at", startOfDay)
    .lte("scheduled_at", endOfDay)
    .neq("status", "cancelled");
  if (agencyId) meetQuery = meetQuery.eq("agency_id", agencyId);
  const { data: meetings, error: meetError } = await meetQuery;

  if (meetError) {
    console.error("Error fetching meetings:", meetError);
    throw meetError;
  }

  const slots: { start: string; end: string; blocked?: boolean }[] = [];

  for (const avail of availability || []) {
    const [startHour, startMin] = avail.start_time.split(":").map(Number);
    const [endHour, endMin] = avail.end_time.split(":").map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + SLOT_DURATION <= endTime) {
      const slotStart = new Date(year, month - 1, day);
      slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

      const slotEnd = new Date(year, month - 1, day);
      slotEnd.setHours(
        Math.floor((currentTime + SLOT_DURATION) / 60),
        (currentTime + SLOT_DURATION) % 60,
        0,
        0
      );

      const isBooked = (meetings || []).some((meeting) => {
        const meetingStart = new Date(meeting.scheduled_at);
        const meetingEnd = new Date(
          meetingStart.getTime() + (meeting.duration_minutes || SLOT_DURATION) * 60000
        );
        return slotStart < meetingEnd && slotEnd > meetingStart;
      });

      const isBlocked = (blockedSlots || []).some((block) => {
        const [blockStartH, blockStartM] = block.start_time.split(":").map(Number);
        const [blockEndH, blockEndM] = block.end_time.split(":").map(Number);
        const blockStartMins = blockStartH * 60 + blockStartM;
        const blockEndMins = blockEndH * 60 + blockEndM;
        const slotStartMins = Math.floor(currentTime);
        const slotEndMins = slotStartMins + SLOT_DURATION;
        return slotStartMins < blockEndMins && slotEndMins > blockStartMins;
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        blocked: isBlocked || isBooked || undefined,
      });

      currentTime += SLOT_DURATION;
    }
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = date === todayStr;

  if (isToday) {
    const bufferMinutes = SLOT_DURATION;
    const minTime = new Date(now.getTime() + bufferMinutes * 60000);
    return slots.filter((slot) => new Date(slot.start) >= minTime);
  }

  return slots;
}

export async function getAllSlotsForDate(
  adminId: string,
  date: string,
  agencyId?: string
): Promise<{ start: string; end: string; blocked?: boolean }[]> {
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  const settings = await getAdminSettings(adminId, agencyId);
  const SLOT_DURATION = settings?.meeting_duration_minutes || 30;

  let availQuery = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
    .eq("is_blocked", false);
  if (agencyId) availQuery = availQuery.eq("agency_id", agencyId);
  const { data: availability, error: availError } = await availQuery;

  if (availError) {
    console.error("Error fetching availability:", availError);
    throw availError;
  }

  let blockQuery = supabaseAdmin
    .from("admin_availability")
    .select("*")
    .eq("admin_id", adminId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
    .eq("is_blocked", true);
  if (agencyId) blockQuery = blockQuery.eq("agency_id", agencyId);
  const { data: blockedSlots } = await blockQuery;

  const slots: { start: string; end: string; blocked?: boolean }[] = [];

  for (const avail of availability || []) {
    const [startHour, startMin] = avail.start_time.split(":").map(Number);
    const [endHour, endMin] = avail.end_time.split(":").map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + SLOT_DURATION <= endTime) {
      const slotStart = new Date(year, month - 1, day);
      slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

      const slotEnd = new Date(year, month - 1, day);
      slotEnd.setHours(
        Math.floor((currentTime + SLOT_DURATION) / 60),
        (currentTime + SLOT_DURATION) % 60,
        0,
        0
      );

      const isBlocked = (blockedSlots || []).some((block) => {
        const [blockStartH, blockStartM] = block.start_time.split(":").map(Number);
        const [blockEndH, blockEndM] = block.end_time.split(":").map(Number);
        const blockStartMins = blockStartH * 60 + blockStartM;
        const blockEndMins = blockEndH * 60 + blockEndM;
        const slotStartMins = Math.floor(currentTime);
        const slotEndMins = slotStartMins + SLOT_DURATION;
        return slotStartMins < blockEndMins && slotEndMins > blockStartMins;
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        blocked: isBlocked || undefined,
      });

      currentTime += SLOT_DURATION;
    }
  }

  return slots;
}

// ============ Contract Upload Functions ============

export async function getScheduledMeetingByEmail(
  adminId: string,
  companyEmail: string
): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("admin_id", adminId)
    .eq("company_email", companyEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching meeting by email:", error);
    return null;
  }

  return data;
}

export async function createMeetingForCompany(
  adminId: string,
  companyEmail: string
): Promise<any> {
  // Get company info if exists
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("company_name, phone")
    .eq("email", companyEmail)
    .single();

  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .insert({
      admin_id: adminId,
      company_email: companyEmail,
      company_name: company?.company_name || null,
      contact_phone: company?.phone || null,
      status: "completed", // Mark as completed since they filled contract offline
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating meeting for company:", error);
    throw error;
  }

  return data;
}

export async function updateMeetingContract(
  meetingId: string,
  data: {
    contract_pdf_url?: string;
    contract_pdf_key?: string;
    contract_signed_at?: string;
    contract_signer_name?: string | null;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update(data)
    .eq("id", meetingId);

  if (error) {
    console.error("Error updating meeting contract:", error);
    throw error;
  }
}
