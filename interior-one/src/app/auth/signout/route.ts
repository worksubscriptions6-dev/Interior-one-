import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UNLOCK_COOKIE } from '@/lib/unlock';

export async function POST(request: Request) {
  await createClient().auth.signOut();
  const res = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  res.cookies.delete(UNLOCK_COOKIE);
  return res;
}
