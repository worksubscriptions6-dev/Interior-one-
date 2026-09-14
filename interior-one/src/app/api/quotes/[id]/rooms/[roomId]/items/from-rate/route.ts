import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { itemFromRateSchema } from '@/server/schemas';
export const POST = route<{ id: string; roomId: string }>(async ({ req, params, user }) =>
  quotesService.addItemFromRate(params.id, params.roomId, await body(req, itemFromRateSchema), user.role));
