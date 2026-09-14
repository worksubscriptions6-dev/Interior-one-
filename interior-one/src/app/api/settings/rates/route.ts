import { route, body } from '@/lib/route';
import { settingsService } from '@/server/settings';
import { rateItemSchema } from '@/server/schemas';
export const GET  = route(async () => settingsService.rates());
export const POST = route(async ({ req }) => settingsService.createRate(await body(req, rateItemSchema)),
  { roles: ['OWNER'] });
