import { route } from '@/lib/route';
import { leadsService } from '@/server/leads';
export const GET = route(async ({ req }) =>
  leadsService.findByPhone(req.nextUrl.searchParams.get('phone') ?? ''));
