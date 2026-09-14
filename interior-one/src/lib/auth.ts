import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { Forbidden, Unauthorized } from '@/lib/errors';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Supabase owns the session. We own the role. */
export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row || !row.active) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Forbidden();
  return user;
}

/** Cost and mark-up are the firm's business. */
export const seesCost = (role: Role) => role === 'OWNER' || role === 'COORDINATOR';
