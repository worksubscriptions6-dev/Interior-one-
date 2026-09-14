import { route, body } from '@/lib/route';
import { projectsService } from '@/server/projects';
import { paymentSchema } from '@/server/schemas';
export const POST = route<{ id: string }>(async ({ req, params }) =>
  projectsService.setPayment(params.id, await body(req, paymentSchema)));
