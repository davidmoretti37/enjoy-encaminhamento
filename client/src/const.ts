export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO = "https://placehold.co/128x128/E1E7EF/1F2937?text=App";

// Generate login URL for Supabase Auth
export const getLoginUrl = () => {
  // Since we're using Supabase Auth, just return the login page
  return '/login';
};
