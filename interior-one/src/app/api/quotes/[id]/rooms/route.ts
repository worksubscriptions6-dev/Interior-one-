import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { roomSchema } from '@/server/schemas';
export const POST = route<{ id: string }>(async ({ req, params, user }) =>
  quotesService.addRoom(params.id, await body(req, roomSchema), user.role));
