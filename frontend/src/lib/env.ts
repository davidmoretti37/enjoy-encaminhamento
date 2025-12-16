/**
 * Frontend Environment Configuration
 *
 * All VITE_* environment variables should be accessed through this module.
 * This provides type safety and a single source of truth for frontend config.
 *
 * Note: Only variables prefixed with VITE_ are exposed to the frontend by Vite.
 */

export const FRONTEND_ENV = {
  // Supabase
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // Application
  appTitle: import.meta.env.VITE_APP_TITLE || "Recruitment Platform",
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || "",
  appLogo: import.meta.env.VITE_APP_LOGO || "",

  // API
  apiUrl: import.meta.env.VITE_API_URL || "",

  // Forge API (for image generation, etc.)
  forgeApiKey: import.meta.env.VITE_FRONTEND_FORGE_API_KEY || "",
  forgeApiUrl: import.meta.env.VITE_FRONTEND_FORGE_API_URL || "",

  // Analytics (optional)
  analyticsEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || "",
  analyticsSiteId: import.meta.env.VITE_ANALYTICS_SITE_ID || "",

  // Environment checks
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

/**
 * Validate frontend environment configuration
 * Logs warnings for missing required variables
 */
export function validateFrontendEnv(): void {
  if (!FRONTEND_ENV.supabaseUrl) {
    console.warn("[ENV] VITE_SUPABASE_URL is not configured - authentication will not work");
  }
  if (!FRONTEND_ENV.supabaseAnonKey) {
    console.warn("[ENV] VITE_SUPABASE_ANON_KEY is not configured - authentication will not work");
  }
}
