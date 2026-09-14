import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { itemSchema } from '@/server/schemas';

type P = { id: string; itemId: string };
export const PATCH  = route<P>(async ({ req, params, user }) =>
  quotesService.updateItem(params.id, params.itemId, await body(req, itemSchema.partial() as never), user.role));
export const DELETE = route<P>(async ({ params, user }) =>
  quotesService.removeItem(params.id, params.itemId, user.role));
