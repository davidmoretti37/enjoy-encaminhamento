import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseAdmin
vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
        deleteUser: vi.fn(),
      },
    },
  },
}));

vi.mock('../services/ai/summarizer', () => ({
  generateCompanySummary: vi.fn().mockResolvedValue(null),
  generateJobSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/matching', () => ({
  generateJobEmbedding: vi.fn().mockResolvedValue(null),
}));

describe('createCompanyWithUser', () => {
  let supabaseAdmin: any;
  let insertSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const supabaseModule = await import('../supabase');
    supabaseAdmin = supabaseModule.supabaseAdmin;
    insertSpy = vi.fn();

    // Track call count to distinguish getCompanyByUserId (select+eq+single)
    // from the actual insert flow
    let companiesSelectCount = 0;

    const usersChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    };

    // getCompanyByUserId chain — returns "not found" so we reach the insert path
    const companiesLookupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    };

    // companies insert chain
    const companiesInsertChain = {
      insert: insertSpy.mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'test-company-id',
          company_name: 'Test Company',
          email: 'test@example.com',
          postal_code: '38400000',
        },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'users') return usersChain as any;
      if (table === 'companies') {
        companiesSelectCount++;
        // First call to companies table is getCompanyByUserId (lookup)
        if (companiesSelectCount === 1) return companiesLookupChain as any;
        // Subsequent calls are for insert/update
        return companiesInsertChain as any;
      }
      return companiesInsertChain as any;
    });
  });

  it('should include cep field mapped to postal_code in insert payload', async () => {
    const { createCompanyWithUser } = await import('../db/companies');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await createCompanyWithUser({
      email: 'test@example.com',
      password: 'password123',
      companyName: 'Test Company',
      cep: '38400000',
    });

    expect(result).toEqual({
      email: 'test@example.com',
      userId: 'test-user-id',
      companyId: 'test-company-id',
    });

    // Verify the structured log was emitted with field keys (not values)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createCompanyWithUser] inserting company fields:',
      expect.arrayContaining(['postal_code'])
    );

    // Verify the insert was called with postal_code mapped from cep input
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        postal_code: '38400000',
        company_name: 'Test Company',
        email: 'test@example.com',
      })
    );

    consoleSpy.mockRestore();
  });

  it('should log field keys before insert for schema mismatch debugging', async () => {
    const { createCompanyWithUser } = await import('../db/companies');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createCompanyWithUser({
      email: 'test2@example.com',
      password: 'password123',
      companyName: 'Another Company',
      cnpj: '12345678000100',
      city: 'Uberlândia',
      state: 'MG',
      cep: '38400000',
    });

    // The log should contain all field keys being inserted
    const logCall = consoleSpy.mock.calls.find(
      (call) => call[0] === '[createCompanyWithUser] inserting company fields:'
    );
    expect(logCall).toBeDefined();
    const fieldKeys = logCall![1] as string[];
    expect(fieldKeys).toContain('user_id');
    expect(fieldKeys).toContain('company_name');
    expect(fieldKeys).toContain('email');
    expect(fieldKeys).toContain('cnpj');
    expect(fieldKeys).toContain('city');
    expect(fieldKeys).toContain('state');
    expect(fieldKeys).toContain('postal_code');
    // Should NOT contain PII values in the log — only field keys
    expect(fieldKeys).not.toContain('38400000');
    expect(fieldKeys).not.toContain('test2@example.com');

    consoleSpy.mockRestore();
  });
});
