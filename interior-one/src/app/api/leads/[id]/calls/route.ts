import { route, body } from '@/lib/route';
import { leadsService } from '@/server/leads';
import { logCallSchema } from '@/server/schemas';

/** The only endpoint that moves a lead's stage. */
export const POST = route<{ id: string }>(async ({ req, params, user }) =>
  leadsService.logCall(params.id, await body(req, logCallSchema), user.id));
