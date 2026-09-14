import { Decimal } from 'decimal.js';
import { LeadSource } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CAMPAIGNS, dateOnly, OPEN_STAGES, stageIndex, STAGE_ORDER } from './constants';

const FUNNEL_PLAN = { leads: 120, contacted: 60, qualified: 30, visit: 15, presented: 9, won: 3 };
const CONVERSION_TARGET = { contacted: 50, qualified: 50, visit: 50, presented: 60, won: 35 };

export class AnalyticsService {

  private monthRange(month: string) {
    const from = new Date(`${month}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    return { from, to };
  }

  /** Month against plan, the funnel, and campaign cost per lead. */
  async month(month: string) {
    const { from, to } = this.monthRange(month);

    const [leads, wonProjects, payments, handovers, target, spend, breakEven, calls] =
      await Promise.all([
        prisma.lead.findMany({
          where: { createdAt: { gte: from, lt: to } },
          select: { id: true, stage: true, furthest: true, source: true, value: true },
        }),
        prisma.project.findMany({
          where: { createdAt: { gte: from, lt: to } },
          select: { id: true, value: true },
        }),
        prisma.payment.findMany({
          where: { receivedAt: { gte: from, lt: to } },
          select: { amount: true },
        }),
        prisma.project.findMany({
          where: { handoverDate: { gte: from, lt: to } },
          select: { handoverDate: true, promisedDate: true },
        }),
        prisma.monthlyTarget.findUnique({ where: { month } }),
        prisma.campaignSpend.findMany({ where: { month } }),
        prisma.setting.findUnique({ where: { key: 'breakEven' } }),
        prisma.call.count({ where: { createdAt: { gte: from, lt: to } } }),
      ]);

    const reached = (stage: string) =>
      leads.filter((l) =>
        l.stage === 'LOST'
          ? stageIndex(l.furthest) >= stageIndex(stage as never)
          : stageIndex(l.stage) >= stageIndex(stage as never),
      ).length;

    const counts = {
      leads: leads.length,
      contacted: reached('CONTACTED'),
      qualified: reached('QUALIFIED'),
      visit: reached('VISIT'),
      presented: reached('PRESENTED'),
      won: leads.filter((l) => l.stage === 'WON').length,
    };

    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

    const funnel = [
      { key: 'leads', label: 'Leads received', value: counts.leads, plan: FUNNEL_PLAN.leads },
      { key: 'contacted', label: 'Contacted', value: counts.contacted, plan: FUNNEL_PLAN.contacted,
        conversion: pct(counts.contacted, counts.leads), target: CONVERSION_TARGET.contacted },
      { key: 'qualified', label: 'Qualified', value: counts.qualified, plan: FUNNEL_PLAN.qualified,
        conversion: pct(counts.qualified, counts.contacted), target: CONVERSION_TARGET.qualified },
      { key: 'visit', label: 'Site visits held', value: counts.visit, plan: FUNNEL_PLAN.visit,
        conversion: pct(counts.visit, counts.qualified), target: CONVERSION_TARGET.visit },
      { key: 'presented', label: 'Presentations', value: counts.presented, plan: FUNNEL_PLAN.presented,
        conversion: pct(counts.presented, counts.visit), target: CONVERSION_TARGET.presented },
      { key: 'won', label: 'Projects won', value: counts.won, plan: FUNNEL_PLAN.won,
        conversion: pct(counts.won, counts.presented), target: CONVERSION_TARGET.won },
    ];

    const spendBy = new Map(spend.map((s) => [s.campaign, new Decimal(s.amount.toString())]));
    const campaigns = CAMPAIGNS.map((c) => {
      const cl = leads.filter((l) => l.source === (c.source as LeadSource));
      const amount = spendBy.get(c.id) ?? new Decimal(0);
      return {
        id: c.id,
        label: c.label,
        spend: amount.toNumber(),
        leads: cl.length,
        cpl: cl.length ? amount.div(cl.length).toDecimalPlaces(0).toNumber() : null,
        targetCpl: c.targetCpl,
        won: cl.filter((l) => l.stage === 'WON').length,
      };
    });

    const booked = wonProjects.reduce((s, p) => s.plus(p.value.toString()), new Decimal(0));
    const collected = payments.reduce((s, p) => s.plus(p.amount.toString()), new Decimal(0));
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

    const lostThisMonth = await prisma.lead.groupBy({
      by: ['lostReason'],
      where: { stage: 'LOST', stageAt: { gte: from, lt: to } },
      _count: { _all: true },
    });

    return {
      month,
      booked: booked.toNumber(),
      target: target ? Number(target.revenue) : 0,
      collected: collected.toNumber(),
      breakEven: Number(breakEven?.value ?? 700000),
      callsLogged: calls,
      handovers: {
        total: handovers.length,
        onTime: handovers.filter(
          (h) => !h.promisedDate || (h.handoverDate && h.handoverDate <= h.promisedDate),
        ).length,
      },
      funnel,
      campaigns,
      costPerWin: wonProjects.length ? Math.round(totalSpend / wonProjects.length) : null,
      freeLeads: leads.filter((l) => !l.source.startsWith('AD_')).length,
      lostReasons: lostThisMonth.map((r) => ({
        reason: r.lostReason ?? 'Not recorded',
        count: r._count._all,
      })),
    };
  }

  /** Booked, collected and receivables aged into buckets. */
  async money() {
    const today = dateOnly();
    const [projects, due] = await Promise.all([
      prisma.project.findMany({ select: { value: true } }),
      prisma.payment.findMany({
        where: { dueAt: { not: null }, receivedAt: null },
        include: { project: { select: { id: true, client: true } } },
        orderBy: { dueAt: 'asc' },
      }),
    ]);

    const received = await prisma.payment.aggregate({
      where: { receivedAt: { not: null } },
      _sum: { amount: true },
    });

    const age = (d: Date) => Math.floor((today.getTime() - d.getTime()) / 86400000);
    const rows = due.map((p) => ({
      projectId: p.projectId,
      client: p.project.client,
      key: p.key,
      amount: Number(p.amount),
      dueAt: p.dueAt,
      ageDays: p.dueAt ? age(p.dueAt) : 0,
    }));

    return {
      booked: projects.reduce((s, p) => s + Number(p.value), 0),
      collected: Number(received._sum.amount ?? 0),
      outstanding: rows.reduce((s, r) => s + r.amount, 0),
      buckets: [
        { label: '0 to 15 days', items: rows.filter((r) => r.ageDays <= 15) },
        { label: '16 to 30 days', items: rows.filter((r) => r.ageDays > 15 && r.ageDays <= 30) },
        { label: 'Over 30 days', items: rows.filter((r) => r.ageDays > 30) },
      ],
    };
  }

  /** Counters for the navigation badges. */
  async badges() {
    const today = dateOnly();
    const [due, open, live, draftQuotes] = await Promise.all([
      prisma.lead.count({
        where: { stage: { in: OPEN_STAGES }, OR: [{ nextCall: null }, { nextCall: { lte: today } }] },
      }),
      prisma.lead.count({ where: { stage: { in: OPEN_STAGES } } }),
      prisma.project.count({ where: { step: { lt: 6 } } }),
      prisma.quote.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
    ]);
    return { due, open, live, draftQuotes };
  }

  stages() {
    return STAGE_ORDER;
  }
}

export const analyticsService = new AnalyticsService();
