import { supabase } from "@/integrations/supabase/client";

export { supabase };

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL) as
  string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
