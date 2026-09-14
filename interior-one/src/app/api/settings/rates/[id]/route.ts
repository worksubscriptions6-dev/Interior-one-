import { route, body } from '@/lib/route';
import { settingsService } from '@/server/settings';
import { rateItemSchema } from '@/server/schemas';

type P = { id: string };
export const PATCH  = route<P>(async ({ req, params }) =>
  settingsService.updateRate(params.id, await body(req, rateItemSchema.partial())), { roles: ['OWNER'] });
export const DELETE = route<P>(async ({ params }) => settingsService.removeRate(params.id),
  { roles: ['OWNER'] });
