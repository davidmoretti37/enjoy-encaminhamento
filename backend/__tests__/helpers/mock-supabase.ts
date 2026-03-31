/**
 * Supabase Mock Factory
 *
 * Creates a chainable mock that mimics the Supabase PostgREST query builder.
 * Each call to `from()` returns a fresh chain, and you can preset return values
 * for the terminal methods (single, maybeSingle, select-as-terminal, etc.).
 */
import { vi } from "vitest";

type MockReturnConfig = {
  data?: any;
  error?: any;
  count?: number | null;
};

/**
 * Create a chainable Supabase query mock.
 * Call `mockResult({ data, error })` before invoking the chain to preset what
 * the terminal method returns.
 */
export function createMockQueryBuilder() {
  let _result: MockReturnConfig = { data: null, error: null };

  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    insert: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    delete: vi.fn().mockImplementation(() => chain),
    upsert: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    neq: vi.fn().mockImplementation(() => chain),
    gt: vi.fn().mockImplementation(() => chain),
    gte: vi.fn().mockImplementation(() => chain),
    lt: vi.fn().mockImplementation(() => chain),
    lte: vi.fn().mockImplementation(() => chain),
    like: vi.fn().mockImplementation(() => chain),
    ilike: vi.fn().mockImplementation(() => chain),
    is: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    contains: vi.fn().mockImplementation(() => chain),
    containedBy: vi.fn().mockImplementation(() => chain),
    or: vi.fn().mockImplementation(() => chain),
    not: vi.fn().mockImplementation(() => chain),
    filter: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    limit: vi.fn().mockImplementation(() => chain),
    range: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockImplementation(() => Promise.resolve(_result)),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(_result)),
    then: vi.fn().mockImplementation((resolve: any) => resolve(_result)),
    // Make the chain itself thenable (for `await supabaseAdmin.from(...).select(...)`)
    [Symbol.toStringTag]: "MockQueryBuilder",
  };

  // Override `then` to make chain awaitable
  Object.defineProperty(chain, "then", {
    value: (resolve: any, reject?: any) => {
      return Promise.resolve(_result).then(resolve, reject);
    },
    writable: true,
    configurable: true,
  });

  return {
    chain,
    /** Preset the result for the next query chain resolution */
    mockResult(result: MockReturnConfig) {
      _result = result;
      return chain;
    },
  };
}

/**
 * Create a full mock Supabase client (both `supabase` and `supabaseAdmin`).
 * Returns the mock and helpers to configure return values per table.
 */
export function createMockSupabase() {
  const tableResults = new Map<string, MockReturnConfig>();
  const builders = new Map<string, ReturnType<typeof createMockQueryBuilder>>();

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (!builders.has(table)) {
      builders.set(table, createMockQueryBuilder());
    }
    const builder = builders.get(table)!;
    const result = tableResults.get(table) || { data: null, error: null };
    builder.mockResult(result);
    return builder.chain;
  });

  const rpcFn = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockClient = {
    from: fromFn,
    rpc: rpcFn,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: "mock-auth-id" } }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  };

  return {
    client: mockClient,
    /** Set what `from(table)` returns */
    setTableResult(table: string, result: MockReturnConfig) {
      tableResults.set(table, result);
    },
    /** Get the query builder for a specific table to inspect calls */
    getBuilder(table: string) {
      return builders.get(table);
    },
    /** Reset all configured results */
    reset() {
      tableResults.clear();
      builders.clear();
      fromFn.mockClear();
      rpcFn.mockClear();
    },
  };
}
