/**
 * The "this device is unlocked" cookie.
 *
 * Signed with Web Crypto so it works in middleware (edge) and route handlers
 * alike. It carries nothing secret — just which user unlocked and until when —
 * and the signature stops anyone forging it.
 */
const COOKIE = 'io_unlock';
const HOURS = 12;

const enc = new TextEncoder();

async function key() {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(process.env.APP_SECRET ?? 'dev-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function signUnlock(userId: string, hours = HOURS) {
  const payload = `${userId}.${Date.now() + hours * 3600_000}`;
  const sig = b64url(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyUnlock(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [userId, expires, sig] = parts;
  const expected = b64url(
    await crypto.subtle.sign('HMAC', await key(), enc.encode(`${userId}.${expires}`)),
  );
  if (sig !== expected) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

export const UNLOCK_COOKIE = COOKIE;
export const UNLOCK_HOURS = HOURS;
