import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service role client. Server only — this key bypasses every policy, so it
 * must never be imported into a client component.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      experimental: { passkey: true },
    },
  } as never,
);
