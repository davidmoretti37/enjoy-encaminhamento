import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jpdqxjaosattvzjjumxz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZHF4amFvc2F0dHZ6amp1bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ4MDIsImV4cCI6MjA3ODM3MDgwMn0.7Vqa9BJSaXmtr1Vf85lfsdwUECbY4DdL8fi6gX9zB-E';

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (use service role key if available)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
