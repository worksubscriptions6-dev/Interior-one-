import { route, body } from '@/lib/route';
import { leadsService } from '@/server/leads';
import { importLeadsSchema } from '@/server/schemas';
export const POST = route(async ({ req, user }) =>
  leadsService.importMany(await body(req, importLeadsSchema), user.id));
