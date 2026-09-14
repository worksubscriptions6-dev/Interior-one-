import { prisma } from '@/lib/db';
import { SETTING_KEYS, WA_DEFAULT } from './constants';
import type { RateItemDto, SettingDto, SpendDto, TargetDto } from './schemas';

export class SettingsService {

  async all() {
    const rows = await prisma.setting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      [SETTING_KEYS.waFirst]: map[SETTING_KEYS.waFirst] ?? WA_DEFAULT,
      [SETTING_KEYS.breakEven]: map[SETTING_KEYS.breakEven] ?? 700000,
      [SETTING_KEYS.gstPct]: map[SETTING_KEYS.gstPct] ?? 18,
      [SETTING_KEYS.markupFloor]: map[SETTING_KEYS.markupFloor] ?? 35,
      [SETTING_KEYS.markupTarget]: map[SETTING_KEYS.markupTarget] ?? 45,
    };
  }

  async set(dto: SettingDto) {
    await prisma.setting.upsert({
      where: { key: dto.key },
      update: { value: dto.value as never },
      create: { key: dto.key, value: dto.value as never },
    });
    return this.all();
  }

  rates() {
    return prisma.rateItem.findMany({
      where: { active: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
  }

  createRate(dto: RateItemDto) {
    return prisma.rateItem.create({ data: dto });
  }

  updateRate(id: string, dto: Partial<RateItemDto>) {
    return prisma.rateItem.update({ where: { id }, data: dto });
  }

  removeRate(id: string) {
    return prisma.rateItem.update({ where: { id }, data: { active: false } })
      .then(() => ({ ok: true }));
  }

  targets() {
    return prisma.monthlyTarget.findMany({ orderBy: { month: 'asc' } });
  }

  setTarget(dto: TargetDto) {
    return prisma.monthlyTarget.upsert({
      where: { month: dto.month },
      update: { revenue: dto.revenue },
      create: { month: dto.month, revenue: dto.revenue },
    });
  }

  spend(month?: string) {
    return prisma.campaignSpend.findMany({
      where: month ? { month } : undefined,
      orderBy: [{ month: 'asc' }, { campaign: 'asc' }],
    });
  }

  setSpend(dto: SpendDto) {
    return prisma.campaignSpend.upsert({
      where: { month_campaign: { month: dto.month, campaign: dto.campaign } },
      update: { amount: dto.amount },
      create: dto,
    });
  }
}

export const settingsService = new SettingsService();
