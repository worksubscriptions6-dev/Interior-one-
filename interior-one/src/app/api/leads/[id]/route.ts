import { route, body } from '@/lib/route';
import { leadsService } from '@/server/leads';
import { updateLeadSchema } from '@/server/schemas';

type P = { id: string };
export const GET   = route<P>(async ({ params }) => leadsService.get(params.id));
export const PATCH = route<P>(async ({ req, params }) =>
  leadsService.update(params.id, await body(req, updateLeadSchema)));
