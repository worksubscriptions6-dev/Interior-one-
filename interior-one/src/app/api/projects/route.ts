import { route } from '@/lib/route';
import { projectsService } from '@/server/projects';
export const GET = route(async () => projectsService.list());
