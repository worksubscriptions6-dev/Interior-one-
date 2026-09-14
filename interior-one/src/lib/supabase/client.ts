'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Passkeys are still an experimental API in supabase-js, so the opt-in flag is
 * required. Needs @supabase/supabase-js 2.105.0 or later.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { experimental: { passkey: true } } } as never,
  );
