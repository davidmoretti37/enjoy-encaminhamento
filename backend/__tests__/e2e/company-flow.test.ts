import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, createTestUser } from './setup';

describe('Company flow (E2E)', () => {
  let supabase: SupabaseClient;
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];

  beforeAll(() => {
    supabase = createServiceClient();
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    for (const id of createdCompanyIds.reverse()) {
      await supabase.from('companies').delete().eq('id', id);
    }
    for (const id of createdUserIds.reverse()) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  it('creates a user with company role', async () => {
    const user = await createTestUser(supabase, { role: 'company' });
    createdUserIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(user.role).toBe('company');
    expect(user.email).toContain('@e2e.local');
  });

  it('creates a company linked to the user', async () => {
    const userId = createdUserIds[0];
    const companyId = crypto.randomUUID();

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        id: companyId,
        user_id: userId,
        company_name: 'Test Corp E2E',
        cnpj: '12.345.678/0001-90',
        email: `company-${companyId.slice(0, 8)}@e2e.local`,
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(company.id).toBe(companyId);
    expect(company.company_name).toBe('Test Corp E2E');
    expect(company.cnpj).toBe('12.345.678/0001-90');
    expect(company.status).toBe('pending');
    expect(company.user_id).toBe(userId);

    createdCompanyIds.push(companyId);
  });

  it('updates company with address fields', async () => {
    const companyId = createdCompanyIds[0];

    const { data: updated, error } = await supabase
      .from('companies')
      .update({
        status: 'active',
        address: 'Rua das Flores, 123',
        city: 'Uberlândia',
        state: 'MG',
        zip_code: '38400-000',
        industry: 'Technology',
        company_size: '11-50',
        website: 'https://testcorp.e2e',
        description: 'A test company for E2E testing',
      })
      .eq('id', companyId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('active');
    expect(updated.address).toBe('Rua das Flores, 123');
    expect(updated.city).toBe('Uberlândia');
    expect(updated.state).toBe('MG');
    expect(updated.zip_code).toBe('38400-000');
    expect(updated.industry).toBe('Technology');
    expect(updated.company_size).toBe('11-50');
    expect(updated.website).toBe('https://testcorp.e2e');
  });

  it('queries company by user_id', async () => {
    const userId = createdUserIds[0];

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(companies).toBeDefined();
    expect(companies!.length).toBe(1);
    expect(companies![0].company_name).toBe('Test Corp E2E');
  });

  it('verifies all fields persist correctly with a fresh client', async () => {
    const companyId = createdCompanyIds[0];
    const freshClient = createServiceClient();

    const { data: company, error } = await freshClient
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    expect(error).toBeNull();
    expect(company.company_name).toBe('Test Corp E2E');
    expect(company.cnpj).toBe('12.345.678/0001-90');
    expect(company.status).toBe('active');
    expect(company.address).toBe('Rua das Flores, 123');
    expect(company.city).toBe('Uberlândia');
    expect(company.state).toBe('MG');
    expect(company.zip_code).toBe('38400-000');
    expect(company.industry).toBe('Technology');
    expect(company.company_size).toBe('11-50');
    expect(company.description).toBe('A test company for E2E testing');
  });
});
