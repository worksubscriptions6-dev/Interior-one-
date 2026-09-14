import { route } from '@/lib/route';
import { leadsService } from '@/server/leads';
export const POST = route<{ id: string }>(async ({ params }) =>
  leadsService.markWhatsappSent(params.id));
