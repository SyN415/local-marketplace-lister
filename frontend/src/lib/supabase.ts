import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Sets the Supabase session using access and refresh tokens.
 * This is crucial when managing auth via a custom backend but using Supabase Storage.
 */
export const setSupabaseSession = async (accessToken: string, refreshToken: string) => {
  if (!accessToken || !refreshToken) return;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('Failed to set Supabase session:', error);
  } else {
    console.log('Supabase session synchronized with custom auth');
  }
};