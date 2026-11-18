import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'));
// `anon`/publishable key is safe in frontend when RLS is correctly configured.
// NEVER use service_role, secret, or database passwords in VITE_* variables.
export const supabase = configured ? createClient(url!, key!, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
}) : null;
export const isAllowedEmail = (email: string) => /@(gm\.gist\.ac\.kr|gist\.ac\.kr)$/i.test(email.trim());
