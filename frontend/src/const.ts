export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO = "/anec-logo.png";

// Generate login URL for Supabase Auth
export const getLoginUrl = () => {
  // Since we're using Supabase Auth, just return the login page
  return '/login';
};
