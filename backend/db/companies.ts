// @ts-nocheck
// Company database operations
import { supabaseAdmin } from "../supabase";
import type { Company, InsertCompany } from "./types";
import { generateCompanySummary, generateJobSummary } from "../services/ai/summarizer";
import { generateJobEmbedding } from "../services/matching";

export async function createCompany(company: InsertCompany): Promise<string> {
  // Use admin client to bypass RLS during company creation (e.g., during onboarding)
  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert(company)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getCompanyByUserId(userId: string): Promise<Company | undefined> {
  // Use admin client to bypass RLS (needed during onboarding flow)
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get company:", error);
    return undefined;
  }

  return data || undefined;
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
  // Use admin client to bypass RLS (needed after company creation during onboarding)
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") return undefined;
  return data || undefined;
}

export async function getCompanyByEmail(email: string): Promise<Company | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("email", email)
    .single();

  if (error) return null;
  return data;
}

export async function createCompanyForExistingUser(
  userEmail: string,
  companyName: string
): Promise<Company | null> {
  // 1. Get the user by email
  const { data: userData, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email, role")
    .eq("email", userEmail)
    .single();

  if (userError || !userData) {
    console.error("[Database] User not found for company creation:", userEmail);
    return null;
  }

  // 2. Check if company already exists for this user
  const existingCompany = await getCompanyByUserId(userData.id);
  if (existingCompany) {
    console.log("[Database] Company already exists for user:", userEmail);
    return existingCompany;
  }

  // 3. Create the company record
  const { data: companyData, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({
      user_id: userData.id,
      company_name: companyName,
      email: userEmail,
      status: "active",
    })
    .select("*")
    .single();

  if (companyError) {
    console.error("[Database] Failed to create company:", companyError);
    return null;
  }

  console.log("[Database] Company created successfully for:", userEmail);
  return companyData;
}

export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select(
      `
      *,
      users!companies_user_id_fkey1(email, name)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get companies:", error);
    return [];
  }

  return data || [];
}

export async function updateCompanyStatus(
  id: string,
  status: "pending" | "active" | "suspended" | "inactive",
  updatedBy: string
): Promise<void> {
  const updates: any = { status };

  if (status === "active") {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = updatedBy;
    updates.suspended_at = null;
    updates.suspended_by = null;
    updates.suspended_reason = null;
  } else if (status === "suspended") {
    updates.suspended_at = new Date().toISOString();
    updates.suspended_by = updatedBy;
  }

  const { error } = await supabaseAdmin.from("companies").update(updates).eq("id", id);

  if (error) {
    console.error("[Database] Failed to update company status:", error);
    throw error;
  }
}

export async function updateCompany(id: string, data: Partial<InsertCompany>): Promise<void> {
  // Use admin client to bypass RLS (needed for contract signing during onboarding)
  const { error } = await supabaseAdmin.from("companies").update(data).eq("id", id);

  if (error) throw error;
}

export async function updateCompanyPipelineStatus(
  companyId: string,
  pipelineStatus: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ pipeline_status: pipelineStatus })
    .eq("id", companyId);

  if (error) {
    console.error("Error updating company pipeline status:", error);
    throw error;
  }
}

export async function createCompanyRegistrationToken(companyId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("companies")
    .update({
      registration_token: token,
      registration_token_expires_at: expiresAt,
    })
    .eq("id", companyId);

  if (error) {
    console.error("Error creating company registration token:", error);
    throw error;
  }

  return token;
}

export async function getCompanyByRegistrationToken(token: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("registration_token", token)
    .single();

  if (error) {
    console.error("Error fetching company by registration token:", error);
    return null;
  }

  if (data && data.registration_token_expires_at) {
    const expiresAt = new Date(data.registration_token_expires_at);
    if (expiresAt < new Date()) {
      return { ...data, isExpired: true };
    }
  }

  return data;
}

export async function completeCompanyRegistration(input: {
  registrationToken: string;
  password: string;
}): Promise<any> {
  const company = await getCompanyByRegistrationToken(input.registrationToken);

  if (!company) {
    throw new Error("Invalid or expired registration token");
  }

  if (company.isExpired) {
    throw new Error("Registration token has expired");
  }

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u: any) => u.email === company.email);

  let authData;
  if (existingUser) {
    const { data: updateData, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: input.password,
      });

    if (updateError) {
      console.error("Failed to update existing user:", updateError);
      throw new Error(`Failed to update user account: ${updateError.message}`);
    }

    authData = { user: updateData.user };
  } else {
    const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: company.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Failed to create auth user:", authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    authData = createData;
  }

  await supabaseAdmin.from("users").upsert(
    {
      id: authData.user.id,
      email: company.email,
      name: company.company_name,
      role: "company",
    },
    { onConflict: "id" }
  );

  const { error: companyError } = await supabaseAdmin
    .from("companies")
    .update({
      user_id: authData.user.id,
      status: "active",
      registration_token: null,
      registration_token_expires_at: null,
    })
    .eq("id", company.id);

  if (companyError) {
    console.error("Failed to update company:", companyError);
    throw new Error("Failed to update company record");
  }

  return { user: authData.user, company };
}

export async function createCompanyWithUser(input: {
  email: string;
  password: string;
  companyName: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  agencyId?: string;
  affiliateId?: string;
  contactPerson?: string;
  businessName?: string;
  website?: string;
  employeeCount?: string;
  cep?: string;
  complement?: string;
  neighborhood?: string;
  pendingContractSigning?: boolean;
  contractSignedAt?: string;
}): Promise<{ email: string; userId: string; companyId: string }> {
  // Check if auth user already exists (handles partial registration retries)
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find((u: any) => u.email === input.email);

  let userId: string;

  if (existingAuthUser) {
    // Reuse existing auth user — update password so they can log in
    console.log("[createCompanyWithUser] Reusing existing auth user:", existingAuthUser.id);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingAuthUser.id,
      { password: input.password }
    );
    if (updateError) {
      console.error("Error updating existing auth user:", updateError);
      throw new Error(`Failed to update existing user account: ${updateError.message}`);
    }
    userId = existingAuthUser.id;
  } else {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: "company",
        name: input.companyName,
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating user for company:", authError);
      throw new Error(authError?.message || "Failed to create user account");
    }
    userId = authData.user.id;
  }

  // Upsert user record (handles both new and retry cases)
  const { error: userError } = await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      email: input.email,
      name: input.companyName,
      role: "company",
    },
    { onConflict: "id" }
  );

  if (userError) {
    console.error("Error upserting user record:", userError);
    if (!existingAuthUser) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    throw userError;
  }

  // Check if company already exists for this user (retry scenario)
  const existingCompany = await getCompanyByUserId(userId);
  if (existingCompany) {
    console.log("[createCompanyWithUser] Company already exists, returning existing:", existingCompany.id);
    return {
      email: input.email,
      userId,
      companyId: existingCompany.id,
    };
  }

  const companyData: any = {
    user_id: userId,
    company_name: input.companyName,
    email: input.email,
    status: "active",
  };

  if (input.cnpj) companyData.cnpj = input.cnpj;
  if (input.phone) companyData.phone = input.phone;
  if (input.address) companyData.address = input.address;
  if (input.city) companyData.city = input.city;
  if (input.state) companyData.state = input.state;
  if (input.agencyId) companyData.agency_id = input.agencyId;
  if (input.affiliateId) companyData.affiliate_id = input.affiliateId;
  if (input.contactPerson) companyData.contact_name = input.contactPerson;
  if (input.businessName) companyData.business_name = input.businessName;
  if (input.website) companyData.website = input.website;
  if (input.employeeCount) companyData.employee_count = input.employeeCount;
  if (input.cep) companyData.postal_code = input.cep;
  // complement and neighborhood are stored in company_forms, not in companies table
  if (input.pendingContractSigning !== undefined) companyData.pending_contract_signing = input.pendingContractSigning;
  if (input.contractSignedAt) companyData.contract_signed_at = input.contractSignedAt;

  const { data: companyResult, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert(companyData)
    .select()
    .single();

  if (companyError) {
    console.error("Error creating company record:", companyError);
    if (!existingAuthUser) {
      await supabaseAdmin.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    throw companyError;
  }

  // Generate company summary in background (fire and forget)
  generateCompanySummary({
    companyName: input.companyName,
    cnpj: input.cnpj,
    city: input.city,
    state: input.state,
  }).then(async (summary) => {
    if (summary) {
      await supabaseAdmin
        .from("companies")
        .update({
          summary,
          summary_generated_at: new Date().toISOString(),
        })
        .eq("id", companyResult.id);
      console.log(`Generated summary for company ${companyResult.id}`);
    }
  }).catch((err) => {
    console.error('Failed to generate company summary:', err);
  });

  return {
    email: input.email,
    userId,
    companyId: companyResult.id,
  };
}

/**
 * Normalize Brazilian state names to 2-letter codes
 */
function normalizeState(state: string): string {
  const BR_STATES: Record<string, string> = {
    // With accents
    'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
    'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES',
    'goiás': 'GO', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
    'minas gerais': 'MG', 'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR',
    'pernambuco': 'PE', 'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
    'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
    'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
    // Without accents
    'amapa': 'AP', 'ceara': 'CE', 'espirito santo': 'ES', 'goias': 'GO',
    'maranhao': 'MA', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
    'piaui': 'PI', 'rondonia': 'RO', 'sao paulo': 'SP',
  };
  const normalized = state.toLowerCase().trim();
  // If already 2 chars, return uppercase
  if (normalized.length === 2) return normalized.toUpperCase();
  // Look up full name
  return BR_STATES[normalized] || state.substring(0, 2).toUpperCase();
}

/**
 * Bulk create companies from Excel/CSV import
 * @param companies Array of company data to insert
 * @param affiliateId The affiliate ID to link companies to
 * @param agencyId Optional agency ID that imported these companies
 * @returns Object with created company IDs and any errors
 */
// Helper to parse salary from formatted string to number in cents
// Handles: "R$ 2.000,00", "600.00", "600,00", "600.00 bolsa", "1500", etc.
function parseSalary(salaryStr?: string): number | null {
  if (!salaryStr) return null;

  // Extract only the numeric part (remove text like "bolsa", "reais", etc.)
  // Match numbers with optional decimal/thousand separators
  const numericMatch = salaryStr.match(/[\d.,]+/);
  if (!numericMatch) return null;

  let numStr = numericMatch[0];

  // Detect format:
  // Brazilian: 1.000,00 (dot = thousand, comma = decimal)
  // International: 1,000.00 (comma = thousand, dot = decimal)
  // Simple with dot: 600.00 (dot = decimal)
  // Simple with comma: 600,00 (comma = decimal)

  const hasComma = numStr.includes(',');
  const hasDot = numStr.includes('.');

  if (hasComma && hasDot) {
    // Both present - determine which is decimal
    const lastComma = numStr.lastIndexOf(',');
    const lastDot = numStr.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Brazilian format: 1.000,00 - comma is decimal
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      // International format: 1,000.00 - dot is decimal
      numStr = numStr.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma - check if it's decimal (followed by 1-2 digits at end)
    if (/,\d{1,2}$/.test(numStr)) {
      numStr = numStr.replace(',', '.');
    } else {
      // Comma is thousand separator
      numStr = numStr.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dot - check if it's decimal (followed by 1-2 digits at end)
    if (/\.\d{1,2}$/.test(numStr)) {
      // Dot is decimal, keep as is
    } else {
      // Dot is thousand separator
      numStr = numStr.replace(/\./g, '');
    }
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? null : Math.round(num * 100); // Convert to cents
}

// Map contract type variations to valid enum values
function normalizeContractType(type?: string): 'estagio' | 'clt' | 'menor-aprendiz' {
  if (!type) return 'estagio';
  const lower = type.toLowerCase().trim();
  if (lower.includes('clt')) return 'clt';
  if (lower.includes('aprendiz') || lower.includes('menor')) return 'menor-aprendiz';
  return 'estagio';
}

// Map work type variations to valid enum values
function normalizeWorkType(type?: string): 'presencial' | 'remoto' | 'hibrido' {
  if (!type) return 'presencial';
  const lower = type.toLowerCase().trim();
  if (lower.includes('remoto') || lower.includes('home')) return 'remoto';
  if (lower.includes('híbrido') || lower.includes('hibrido')) return 'hibrido';
  return 'presencial';
}

// Map education level to valid enum values
function normalizeEducationLevel(level?: string): 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null {
  if (!level) return null;
  const lower = level.toLowerCase().trim();
  if (lower.includes('fundamental')) return 'fundamental';
  if (lower.includes('médio') || lower.includes('medio') || lower.includes('tecnico') || lower.includes('técnico')) return 'medio';
  if (lower.includes('superior') || lower.includes('graduação') || lower.includes('graduacao') || lower.includes('faculdade')) return 'superior';
  if (lower.includes('pós') || lower.includes('pos') || lower.includes('mestrado') || lower.includes('doutorado')) return 'pos-graduacao';
  return null;
}

export async function bulkCreateCompanies(
  companies: Array<{
    company_name: string;
    email: string;
    emails?: Array<{
      email: string;
      label: string;
      isPrimary: boolean;
    }>;
    cnpj?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string; // Frontend uses zip_code, we map to postal_code
    industry?: string;
    company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
    website?: string;
    description?: string;
    notes?: string;
    // Job data (optional)
    job?: {
      title: string;
      description?: string;
      salary?: string;
      schedule?: string;
      benefits?: string;
      contract_type?: string;
      work_type?: string;
      required_skills?: string;
      openings?: string;
      urgency?: string;
      gender_preference?: string;
      age_range?: string;
      education?: string;
      notes?: string;
    };
  }>,
  affiliateId: string,
  agencyId?: string
): Promise<{ created: string[]; errors: { email: string; message: string }[] }> {
  const created: string[] = [];
  const errors: { email: string; message: string }[] = [];

  for (const company of companies) {
    try {
      // Check if company with this email already exists
      const existing = await getCompanyByEmail(company.email);
      if (existing) {
        errors.push({
          email: company.email,
          message: `Empresa com email ${company.email} já existe`,
        });
        continue;
      }

      // Prepare company data - map frontend field names to database column names
      const companyData: any = {
        company_name: company.company_name,
        email: company.email,
        affiliate_id: affiliateId,
        agency_id: agencyId || null,
        status: 'pending',
      };

      // Add optional fields if provided (with sanitization to match DB constraints)
      if (company.cnpj) companyData.cnpj = company.cnpj.replace(/\D/g, ''); // Strip non-digits, store as 14 chars
      if (company.phone) companyData.phone = company.phone.substring(0, 20); // VARCHAR(20)
      if (company.address) companyData.address = company.address;
      if (company.city) companyData.city = company.city.substring(0, 100); // VARCHAR(100)
      if (company.state) companyData.state = normalizeState(company.state); // Convert to 2-letter code
      if (company.zip_code) companyData.postal_code = company.zip_code.substring(0, 9); // VARCHAR(9)
      if (company.industry) companyData.industry = company.industry;
      if (company.company_size) companyData.company_size = company.company_size;
      if (company.website) companyData.website = company.website;
      if (company.description) companyData.description = company.description;
      if (company.notes) companyData.notes = company.notes;

      // Insert the company
      const { data, error } = await supabaseAdmin
        .from("companies")
        .insert(companyData)
        .select("id")
        .single();

      if (error) {
        errors.push({
          email: company.email,
          message: error.message,
        });
      } else if (data) {
        created.push(data.id);

        // Generate registration token for login access
        try {
          await createCompanyRegistrationToken(data.id);
        } catch (tokenError) {
          console.error(`Failed to create registration token for company ${data.id}:`, tokenError);
        }

        // Save multiple emails to company_emails table if provided
        if (company.emails && company.emails.length > 0) {
          const emailRecords = company.emails.map(e => ({
            company_id: data.id,
            label: e.label || 'Principal',
            email: e.email,
            is_primary: e.isPrimary ?? false,
          }));

          await supabaseAdmin
            .from('company_emails')
            .insert(emailRecords);
        }

        // Create job if job data is provided
        console.log(`[BulkImport] Job data for ${company.company_name}:`, company.job ? `title="${company.job.title}"` : 'NO JOB DATA');
        if (company.job && company.job.title) {
          console.log(`[BulkImport] Creating job "${company.job.title}" for company "${company.company_name}"`);

          const salaryInCents = parseSalary(company.job.salary);
          const benefitsArray = company.job.benefits
            ? company.job.benefits.split(',').map(b => b.trim()).filter(b => b)
            : null;
          // Parse openings count, default to 1
          const openingsCount = company.job.openings ? parseInt(company.job.openings, 10) : 1;

          const { data: jobData, error: jobError } = await supabaseAdmin.from('jobs').insert({
            company_id: data.id,
            agency_id: agencyId || null,
            title: company.job.title,
            description: company.job.description || '',
            salary: salaryInCents,
            work_schedule: company.job.schedule || null,
            benefits: benefitsArray ? JSON.stringify(benefitsArray) : null,
            contract_type: normalizeContractType(company.job.contract_type),
            work_type: normalizeWorkType(company.job.work_type),
            required_skills: company.job.required_skills || null,
            openings: isNaN(openingsCount) ? 1 : openingsCount,
            min_education_level: normalizeEducationLevel(company.job.education),
            specific_requirements: company.job.notes || null,
            status: 'open',
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
          }).select('id').single();

          if (jobError) {
            console.error(`[BulkImport] Failed to create job for ${company.company_name}:`, jobError);
          } else {
            console.log(`[BulkImport] Successfully created job ${jobData?.id} for ${company.company_name}`);

            // Generate job summary in background (fire and forget)
            if (jobData?.id) {
              generateJobSummary({
                title: company.job.title,
                description: company.job.description || '',
                contractType: normalizeContractType(company.job.contract_type),
                workType: normalizeWorkType(company.job.work_type),
                requirements: company.job.required_skills,
                benefits: company.job.benefits,
                salary: company.job.salary,
                companyName: company.company_name,
              }).then(async (summary) => {
                if (summary) {
                  await supabaseAdmin
                    .from("jobs")
                    .update({
                      summary,
                      summary_generated_at: new Date().toISOString(),
                    })
                    .eq("id", jobData.id);
                  console.log(`Generated summary for job ${jobData.id}`);
                  // Generate embedding from summary
                  await generateJobEmbedding(jobData.id);
                  console.log(`Generated embedding for job ${jobData.id}`);
                }
              }).catch((err) => {
                console.error(`Failed to generate job summary/embedding for ${jobData.id}:`, err);
              });
            }
          }
        }

        // Generate company summary in background (fire and forget)
        generateCompanySummary({
          companyName: company.company_name,
          cnpj: company.cnpj,
          industry: company.industry,
          companySize: company.company_size,
          website: company.website,
          description: company.description,
          city: company.city,
          state: company.state,
          jobTitle: company.job?.title,
          contractType: company.job?.contract_type,
          workType: company.job?.work_type,
          mainActivities: company.job?.description,
          requiredSkills: company.job?.required_skills,
          notes: company.notes,
        }).then(async (summary) => {
          if (summary) {
            await supabaseAdmin
              .from("companies")
              .update({
                summary,
                summary_generated_at: new Date().toISOString(),
              })
              .eq("id", data.id);
            console.log(`Generated summary for company ${data.id}`);
          }
        }).catch((err) => {
          console.error(`Failed to generate company summary for ${data.id}:`, err);
        });
      }
    } catch (err: any) {
      errors.push({
        email: company.email,
        message: err.message || 'Erro desconhecido',
      });
    }
  }

  return { created, errors };
}

/**
 * Get company's jobs with their matching status and match count
 */
export async function getCompanyJobsWithStatus(
  companyId: string
): Promise<Array<{
  id: string;
  title: string;
  status: string;
  matching_status?: string;
  match_count?: number;
}>> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get company jobs with status:', error);
    return [];
  }

  // Fetch match counts for each job
  const jobsWithCounts = await Promise.all(
    (data || []).map(async (job) => {
      const { count } = await supabaseAdmin
        .from('job_matches')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job.id);

      return {
        ...job,
        match_count: count || 0,
      };
    })
  );

  return jobsWithCounts;
}

/**
 * Create a job request from a company
 */
export async function createJobRequest(params: {
  companyId: string;
  requestedByUserId: string;
  details: string;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('job_requests')
    .insert({
      company_id: params.companyId,
      requested_by: params.requestedByUserId,
      request_details: params.details,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Database] Failed to create job request:', error);
    throw error;
  }

  return data.id;
}
