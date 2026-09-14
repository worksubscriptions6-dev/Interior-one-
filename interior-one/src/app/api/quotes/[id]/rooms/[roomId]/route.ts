import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { roomSchema } from '@/server/schemas';

type P = { id: string; roomId: string };
export const PATCH  = route<P>(async ({ req, params, user }) =>
  quotesService.updateRoom(params.id, params.roomId, await body(req, roomSchema), user.role));
export const DELETE = route<P>(async ({ params, user }) =>
  quotesService.removeRoom(params.id, params.roomId, user.role));
