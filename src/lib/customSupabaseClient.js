import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdeuwvaauerzjdtpwjjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZXV3dmFhdWVyempkdHB3amp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTkxNTksImV4cCI6MjA3NDg5NTE1OX0.ktxs6yjuy3hRXCjsDzK1x6lJg0e5yEEnzl554nx28Kc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'bonplaninfos' }
  }
})