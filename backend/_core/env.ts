/**
 * Centralized Environment Configuration
 *
 * All environment variables should be accessed through this module.
 * This provides:
 * - Type safety
 * - Validation on startup
 * - Default values where appropriate
 * - Clear documentation of required vs optional variables
 */

// Validation helpers
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}

function optionalEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid integer for ${key}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

// Centralized environment configuration
export const ENV = {
  // Application
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
  port: optionalEnvInt("PORT", 5001),
  appUrl: optionalEnv("APP_URL", "http://localhost:5001"),

  // Supabase - lazy loaded to allow for startup without immediate validation
  get supabaseUrl(): string {
    return requireEnv("SUPABASE_URL");
  },
  get supabaseAnonKey(): string {
    return requireEnv("SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey(): string {
    // Service role key is required for admin operations
    return optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  },

  // LLM / OpenRouter
  openrouterApiKey: optionalEnv("OPENROUTER_API_KEY"),
  llmModel: optionalEnv("LLM_MODEL", "anthropic/claude-haiku-4-5-20250414"),

  // Legacy Forge API (internal services)
  forgeApiUrl: optionalEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: optionalEnv("BUILT_IN_FORGE_API_KEY"),

  // SMTP Configuration
  smtp: {
    host: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
    port: optionalEnvInt("SMTP_PORT", 587),
    user: optionalEnv("SMTP_USER"),
    pass: optionalEnv("SMTP_PASS"),
    get emailFrom(): string {
      return optionalEnv("EMAIL_FROM") || optionalEnv("SMTP_USER") || "";
    },
    isConfigured(): boolean {
      return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    },
  },

  // Zoom Integration (optional)
  zoom: {
    accountId: optionalEnv("ZOOM_ACCOUNT_ID"),
    clientId: optionalEnv("ZOOM_CLIENT_ID"),
    clientSecret: optionalEnv("ZOOM_CLIENT_SECRET"),
    isConfigured(): boolean {
      return !!(
        process.env.ZOOM_ACCOUNT_ID &&
        process.env.ZOOM_CLIENT_ID &&
        process.env.ZOOM_CLIENT_SECRET
      );
    },
  },

  // Google Calendar/Meet Integration (optional)
  google: {
    clientId: optionalEnv("GOOGLE_CLIENT_ID"),
    clientSecret: optionalEnv("GOOGLE_CLIENT_SECRET"),
    refreshToken: optionalEnv("GOOGLE_REFRESH_TOKEN"),
    isConfigured(): boolean {
      return !!(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN
      );
    },
  },

  // Autentique Digital Signature Integration (optional)
  autentique: {
    apiKey: optionalEnv("AUTENTIQUE_API_KEY"),
    sandbox: optionalEnv("AUTENTIQUE_SANDBOX", "true") === "true",
    webhookSecret: optionalEnv("AUTENTIQUE_WEBHOOK_SECRET"),
    isConfigured(): boolean {
      return !!process.env.AUTENTIQUE_API_KEY;
    },
  },

  // Legacy fields (for backward compatibility with existing code)
  appId: optionalEnv("VITE_APP_ID"),
  cookieSecret: optionalEnv("JWT_SECRET"),
  databaseUrl: optionalEnv("DATABASE_URL"),
  oAuthServerUrl: optionalEnv("OAUTH_SERVER_URL"),
  ownerOpenId: optionalEnv("OWNER_OPEN_ID"),
} as const;

/**
 * Validate environment configuration
 * Call this on startup to ensure all required variables are set
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required in all environments
  try {
    ENV.supabaseUrl;
  } catch {
    errors.push("SUPABASE_URL is required");
  }

  try {
    ENV.supabaseAnonKey;
  } catch {
    errors.push("SUPABASE_ANON_KEY is required");
  }

  // Required in production
  if (ENV.isProduction) {
    if (!ENV.supabaseServiceRoleKey) {
      errors.push("SUPABASE_SERVICE_ROLE_KEY is required in production");
    }
    if (!ENV.smtp.isConfigured()) {
      errors.push("SMTP configuration (SMTP_USER, SMTP_PASS) is required in production");
    }
  }

  // Warnings for missing optional configs
  if (!ENV.openrouterApiKey) {
    console.warn("[ENV] OPENROUTER_API_KEY not set - AI matching will not work");
  }

  if (!ENV.smtp.isConfigured()) {
    console.warn("[ENV] SMTP not configured - emails will not be sent");
  }

  if (!ENV.zoom.isConfigured()) {
    console.warn("[ENV] Zoom not configured - Zoom meetings will not work");
  }

  if (!ENV.google.isConfigured()) {
    console.warn("[ENV] Google not configured - Google Meet will not work");
  }

  if (!ENV.autentique.isConfigured()) {
    console.warn("[ENV] Autentique not configured - Digital signatures will not work");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate and throw if invalid (use on startup)
 */
export function validateEnvOrThrow(): void {
  const { valid, errors } = validateEnv();
  if (!valid) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}
