import { route, body } from '@/lib/route';
import { settingsService } from '@/server/settings';
import { targetSchema } from '@/server/schemas';
export const GET  = route(async () => settingsService.targets());
export const POST = route(async ({ req }) => settingsService.setTarget(await body(req, targetSchema)),
  { roles: ['OWNER'] });
