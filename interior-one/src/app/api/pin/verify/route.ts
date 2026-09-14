import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { verifyPin } from '@/lib/pin';
import { AppError } from '@/lib/errors';
import { signUnlock, UNLOCK_COOKIE, UNLOCK_HOURS } from '@/lib/unlock';

export const runtime = 'nodejs';

const schema = z.object({ pin: z.string().regex(/^\d{4,8}$/, 'Enter your PIN.') });

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 });

    const { pin } = schema.parse(await req.json());
    await verifyPin(user.id, pin);

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: UNLOCK_COOKIE,
      value: await signUnlock(user.id),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: UNLOCK_HOURS * 3600,
    });
    return res;
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: 'Enter your PIN.' }, { status: 400 });
  }
}
