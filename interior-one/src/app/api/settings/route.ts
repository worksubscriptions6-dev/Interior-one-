import { route, body } from '@/lib/route';
import { settingsService } from '@/server/settings';
import { settingSchema } from '@/server/schemas';
export const GET  = route(async () => settingsService.all());
export const POST = route(async ({ req }) => settingsService.set(await body(req, settingSchema) as never),
  { roles: ['OWNER'] });
