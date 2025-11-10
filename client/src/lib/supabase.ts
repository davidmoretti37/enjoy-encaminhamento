import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../server/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jpdqxjaosattvzjjumxz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZHF4amFvc2F0dHZ6amp1bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ4MDIsImV4cCI6MjA3ODM3MDgwMn0.7Vqa9BJSaXmtr1Vf85lfsdwUECbY4DdL8fi6gX9zB-E';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
