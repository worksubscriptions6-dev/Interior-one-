import { route, body } from '@/lib/route';
import { settingsService } from '@/server/settings';
import { spendSchema } from '@/server/schemas';
export const GET  = route(async ({ req }) =>
  settingsService.spend(req.nextUrl.searchParams.get('month') ?? undefined));
export const POST = route(async ({ req }) => settingsService.setSpend(await body(req, spendSchema)),
  { roles: ['OWNER'] });
