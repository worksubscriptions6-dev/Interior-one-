import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { itemSchema } from '@/server/schemas';
export const POST = route<{ id: string; roomId: string }>(async ({ req, params, user }) =>
  quotesService.addItem(params.id, params.roomId, await body(req, itemSchema), user.role));
