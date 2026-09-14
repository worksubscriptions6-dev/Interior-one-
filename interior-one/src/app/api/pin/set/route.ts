import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { setPin, verifyPin, hasPin } from '@/lib/pin';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, 'The PIN must be 4 to 8 digits.'),
  currentPin: z.string().optional(),
  /** An owner resetting a teammate's PIN */
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 });

    const { pin, currentPin, userId } = schema.parse(await req.json());

    if (userId && userId !== me.id) {
      if (me.role !== 'OWNER') {
        return NextResponse.json({ message: 'Only the owner can reset a PIN.' }, { status: 403 });
      }
      await setPin(userId, pin);
      const who = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      return NextResponse.json({ ok: true, message: `PIN set for ${who?.name ?? 'that person'}.` });
    }

    // Changing your own PIN means proving you know the old one.
    if (await hasPin(me.id)) {
      if (!currentPin) {
        return NextResponse.json({ message: 'Enter your current PIN first.' }, { status: 400 });
      }
      await verifyPin(me.id, currentPin);
    }

    await setPin(me.id, pin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: 'That PIN is not valid.' }, { status: 400 });
  }
}
