import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { Role } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { requireUser, SessionUser } from '@/lib/auth';

interface Ctx<P> {
  req: NextRequest;
  params: P;
  user: SessionUser;
}

/**
 * Wraps a route handler: authenticates, checks the role, and turns thrown
 * AppErrors and Zod failures into proper status codes instead of 500s.
 */
export function route<P = Record<string, string>>(
  fn: (ctx: Ctx<P>) => Promise<unknown>,
  opts: { roles?: Role[] } = {},
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const user = await requireUser();
      if (opts.roles?.length && !opts.roles.includes(user.role)) {
        return NextResponse.json(
          { message: 'Your role does not have access to this.' },
          { status: 403 },
        );
      }
      const params = ((await context?.params) ?? {}) as P;
      const data = await fn({ req, params, user });
      return NextResponse.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { message: err.issues[0]?.message ?? 'That request is not valid.', issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof AppError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ message: 'Something went wrong at our end.' }, { status: 500 });
    }
  };
}

export async function body<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  return schema.parse(await req.json());
}

export function query<T>(req: NextRequest, schema: ZodSchema<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
