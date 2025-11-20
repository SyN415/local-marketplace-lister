import { createClient } from '@supabase/supabase-js';
import config from './config';

const supabaseUrl = config.SUPABASE_URL;
const supabaseAnonKey = config.SUPABASE_ANON_KEY;
const supabaseServiceKey = config.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('CRITICAL: SUPABASE_SERVICE_KEY is missing in config!');
} else {
  console.log('Supabase Admin Client initialized with Service Key:', supabaseServiceKey.substring(0, 10) + '...');
}

// Client for authenticated requests (server-side with service key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;