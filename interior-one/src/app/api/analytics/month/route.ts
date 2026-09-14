import { route } from '@/lib/route';
import { analyticsService } from '@/server/analytics';
export const GET = route(async ({ req }) =>
  analyticsService.month(req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)));
