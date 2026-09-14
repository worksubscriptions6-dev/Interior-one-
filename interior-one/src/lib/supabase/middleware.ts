import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UNLOCK_COOKIE, verifyUnlock } from '@/lib/unlock';

/**
 * Two gates on every request.
 *   1. Supabase session — who you are. Missing, and you go to /login.
 *   2. Unlock cookie — this device is unlocked right now. Missing or expired,
 *      and you go to /lock to type the PIN.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isLogin = path.startsWith('/login');
  const isLock = path.startsWith('/lock');
  // The PIN endpoints have to stay reachable while the app is locked.
  const isUnlockApi = path.startsWith('/api/pin');

  const redirect = (to: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    if (keepNext && path !== '/') url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isLogin || isUnlockApi) return response;
    if (path.startsWith('/api')) {
      return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 });
    }
    return redirect('/login', true);
  }

  const unlockedFor = await verifyUnlock(request.cookies.get(UNLOCK_COOKIE)?.value);
  const unlocked = unlockedFor === user.id;

  if (!unlocked && !isLock && !isUnlockApi) {
    if (path.startsWith('/api')) {
      return NextResponse.json({ message: 'Locked. Enter your PIN.', locked: true }, { status: 423 });
    }
    return redirect('/lock', true);
  }

  if (unlocked && (isLock || isLogin)) return redirect('/leads');

  return response;
}
