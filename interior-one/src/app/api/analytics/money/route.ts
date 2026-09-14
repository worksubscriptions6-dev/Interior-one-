import { route } from '@/lib/route';
import { analyticsService } from '@/server/analytics';
export const GET = route(async () => analyticsService.money());
