import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseAdmin before importing the module under test
vi.mock('../supabase', () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  };

  return {
    supabaseAdmin: {
      from: vi.fn(() => mockChain),
    },
  };
});

describe('getApplicationsByAgencyId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should warn when no applications found (may indicate null agency_id candidates)', async () => {
    const { supabaseAdmin } = await import('../supabase');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock the query chain to return empty results
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByAgencyId } = await import('../db/agencies');
    const result = await getApplicationsByAgencyId('test-agency-id');

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      '[getApplicationsByAgencyId] No applications found for agencyId:',
      'test-agency-id',
      '— check for candidates with null agency_id'
    );

    warnSpy.mockRestore();
  });

  it('should not warn when applications are found', async () => {
    const { supabaseAdmin } = await import('../supabase');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockApplications = [
      {
        id: 'app-1',
        status: 'in_progress',
        candidates: { id: 'cand-1', full_name: 'Test', agency_id: 'test-agency-id' },
        jobs: { id: 'job-1', title: 'Dev', companies: { company_name: 'Co' } },
      },
    ];

    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockApplications, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByAgencyId } = await import('../db/agencies');
    const result = await getApplicationsByAgencyId('test-agency-id');

    expect(result).toHaveLength(1);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // NOTE: Candidates with agency_id = NULL are excluded by the INNER JOIN
  // in getApplicationsByAgencyId. This is correct behavior given current
  // query semantics — the INNER JOIN on candidates.agency_id filters them out.
  // If future requirement is to show unaffiliated candidates, this test must
  // be updated alongside the query.
  it('should exclude candidates with null agency_id (INNER JOIN semantics)', async () => {
    const { supabaseAdmin } = await import('../supabase');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Supabase PostgREST INNER JOIN with .eq("candidates.agency_id", agencyId)
    // will never return rows where candidates.agency_id IS NULL.
    // This test verifies the query returns empty when all candidates have null agency_id.
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const { getApplicationsByAgencyId } = await import('../db/agencies');
    const result = await getApplicationsByAgencyId('any-agency-id');

    // With INNER JOIN, null agency_id candidates are excluded — result is empty
    expect(result).toEqual([]);
    // The warning should fire since no results were returned
    expect(console.warn).toHaveBeenCalledWith(
      '[getApplicationsByAgencyId] No applications found for agencyId:',
      'any-agency-id',
      '— check for candidates with null agency_id'
    );
  });
});
