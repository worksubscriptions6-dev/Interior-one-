import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { updateQuoteSchema } from '@/server/schemas';

type P = { id: string };
export const GET    = route<P>(async ({ params, user }) => quotesService.get(params.id, user.role));
export const PATCH  = route<P>(async ({ req, params, user }) =>
  quotesService.update(params.id, await body(req, updateQuoteSchema), user.role));
export const DELETE = route<P>(async ({ params }) => quotesService.remove(params.id),
  { roles: ['OWNER'] });
