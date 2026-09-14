import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { BadRequest, Forbidden } from '@/lib/errors';

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);

export async function setPin(userId: string, pin: string) {
  if (!isValidPin(pin)) throw new BadRequest('The PIN must be 4 to 8 digits.');
  await prisma.user.update({
    where: { id: userId },
    data: { pinHash: await bcrypt.hash(pin, 10), pinFailures: 0, pinLockedTill: null },
  });
  return { ok: true };
}

/**
 * Five wrong tries locks the PIN for fifteen minutes. Without this a four
 * digit code is worth almost nothing — a script would walk all ten thousand
 * combinations in well under a minute.
 */
export async function verifyPin(userId: string, pin: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.pinHash) throw new BadRequest('No PIN is set for this account yet.');

  if (user.pinLockedTill && user.pinLockedTill > new Date()) {
    const mins = Math.ceil((user.pinLockedTill.getTime() - Date.now()) / 60000);
    throw new Forbidden(`Too many wrong tries. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }

  if (await bcrypt.compare(pin, user.pinHash)) {
    if (user.pinFailures) {
      await prisma.user.update({
        where: { id: userId },
        data: { pinFailures: 0, pinLockedTill: null },
      });
    }
    return true;
  }

  const failures = user.pinFailures + 1;
  const locked = failures >= MAX_FAILURES;
  await prisma.user.update({
    where: { id: userId },
    data: {
      pinFailures: locked ? 0 : failures,
      pinLockedTill: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
    },
  });

  throw locked
    ? new Forbidden(`Too many wrong tries. The PIN is locked for ${LOCKOUT_MINUTES} minutes.`)
    : new BadRequest(`Wrong PIN. ${MAX_FAILURES - failures} tries left.`);
}

export async function hasPin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  return Boolean(u?.pinHash);
}
