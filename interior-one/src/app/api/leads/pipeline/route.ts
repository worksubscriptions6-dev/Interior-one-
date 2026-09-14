import { route } from '@/lib/route';
import { leadsService } from '@/server/leads';
export const GET = route(async () => leadsService.pipeline());
