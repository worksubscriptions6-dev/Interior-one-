import { route, body } from '@/lib/route';
import { projectsService } from '@/server/projects';
import { setStepSchema } from '@/server/schemas';
export const POST = route<{ id: string }>(async ({ req, params }) =>
  projectsService.setStep(params.id, await body(req, setStepSchema)));
