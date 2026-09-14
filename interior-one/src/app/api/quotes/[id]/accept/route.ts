import { route } from '@/lib/route';
import { quotesService } from '@/server/quotes';

/** Sets the contract value, writes the timeline entry, wins the lead, opens the project. */
export const POST = route<{ id: string }>(async ({ params, user }) =>
  quotesService.accept(params.id, user.role));
