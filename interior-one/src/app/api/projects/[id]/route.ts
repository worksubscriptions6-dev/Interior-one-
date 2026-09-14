import { route, body } from '@/lib/route';
import { projectsService } from '@/server/projects';
import { updateProjectSchema } from '@/server/schemas';

type P = { id: string };
export const GET    = route<P>(async ({ params }) => projectsService.get(params.id));
export const PATCH  = route<P>(async ({ req, params }) =>
  projectsService.update(params.id, await body(req, updateProjectSchema)));
/** Deleting returns the lead to Negotiation with today as the next call. */
export const DELETE = route<P>(async ({ params }) => projectsService.remove(params.id),
  { roles: ['OWNER'] });
