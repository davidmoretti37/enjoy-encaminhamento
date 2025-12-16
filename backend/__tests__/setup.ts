/**
 * Test Setup
 *
 * This file is loaded before tests run.
 * Configure test environment variables and mocks here.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Supabase credentials for tests that don't hit the database
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
