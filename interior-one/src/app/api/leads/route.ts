import { route, body, query } from '@/lib/route';
import { leadsService } from '@/server/leads';
import { createLeadSchema, listLeadsSchema } from '@/server/schemas';

export const GET  = route(async ({ req }) => leadsService.list(query(req, listLeadsSchema)));
export const POST = route(async ({ req, user }) =>
  leadsService.create(await body(req, createLeadSchema), user.id));
