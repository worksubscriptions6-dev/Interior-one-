import { route } from '@/lib/route';
import { quotesService } from '@/server/quotes';
export const POST = route<{ id: string }>(async ({ params, user }) =>
  quotesService.revise(params.id, user.id, user.role));
