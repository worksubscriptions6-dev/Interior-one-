import { route, body } from '@/lib/route';
import { quotesService } from '@/server/quotes';
import { createQuoteSchema } from '@/server/schemas';

export const GET = route(async ({ req, user }) => {
  const leadId = req.nextUrl.searchParams.get('leadId');
  return leadId ? quotesService.forLead(leadId, user.role) : quotesService.list(user.role);
});
export const POST = route(async ({ req, user }) =>
  quotesService.create(await body(req, createQuoteSchema), user.id, user.role));
