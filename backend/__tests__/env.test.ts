import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ENV module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('requireEnv helper', () => {
    it('should throw when required env var is missing', async () => {
      delete process.env.SUPABASE_URL;

      const { ENV } = await import('../_core/env');

      expect(() => ENV.supabaseUrl).toThrow('Missing required environment variable: SUPABASE_URL');
    });

    it('should return value when env var exists', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-key';

      const { ENV } = await import('../_core/env');

      expect(ENV.supabaseUrl).toBe('https://test.supabase.co');
    });
  });

  describe('optionalEnv helper', () => {
    it('should use default value when env var is missing', async () => {
      delete process.env.PORT;

      const { ENV } = await import('../_core/env');

      expect(ENV.port).toBe(5001);
    });

    it('should use env value when set', async () => {
      process.env.PORT = '3000';

      const { ENV } = await import('../_core/env');

      expect(ENV.port).toBe(3000);
    });
  });

  describe('SMTP configuration', () => {
    it('should report not configured when credentials missing', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const { ENV } = await import('../_core/env');

      expect(ENV.smtp.isConfigured()).toBe(false);
    });

    it('should report configured when credentials present', async () => {
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'password';

      const { ENV } = await import('../_core/env');

      expect(ENV.smtp.isConfigured()).toBe(true);
    });
  });

  describe('Zoom configuration', () => {
    it('should report not configured when credentials missing', async () => {
      delete process.env.ZOOM_ACCOUNT_ID;
      delete process.env.ZOOM_CLIENT_ID;
      delete process.env.ZOOM_CLIENT_SECRET;

      const { ENV } = await import('../_core/env');

      expect(ENV.zoom.isConfigured()).toBe(false);
    });

    it('should report configured when all credentials present', async () => {
      process.env.ZOOM_ACCOUNT_ID = 'account123';
      process.env.ZOOM_CLIENT_ID = 'client123';
      process.env.ZOOM_CLIENT_SECRET = 'secret123';

      const { ENV } = await import('../_core/env');

      expect(ENV.zoom.isConfigured()).toBe(true);
    });
  });

  describe('validateEnv', () => {
    it('should return errors when required vars missing', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      const { validateEnv } = await import('../_core/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SUPABASE_URL is required');
      expect(result.errors).toContain('SUPABASE_ANON_KEY is required');
    });

    it('should pass when required vars present', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-key';

      const { validateEnv } = await import('../_core/env');
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
