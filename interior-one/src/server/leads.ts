import { BadRequest, NotFound } from '@/lib/errors';
import { Prisma, LeadStage } from '@prisma/client';
import { prisma } from '@/lib/db';
import { projectsService } from './projects';
import {
  addDays, dateOnly, isOpenStage, OPEN_STAGES, stageIndex,
} from './constants';
import type {
  CreateLeadDto, ImportLeadsDto, ListLeadsQuery, LogCallDto, UpdateLeadDto,
} from './schemas';

const LEAD_INCLUDE = {
  owner: { select: { id: true, name: true } },
  calls: { orderBy: { createdAt: 'desc' as const }, take: 50,
           include: { user: { select: { id: true, name: true } } } },
  quotes: { orderBy: [{ base: 'desc' as const }, { rev: 'desc' as const }],
            select: { id: true, no: true, rev: true, status: true, date: true } },
  project: { select: { id: true, step: true, promisedDate: true } },
};

export class LeadsService {

  // ---------------------------------------------------------------- listing

  async list(q: ListLeadsQuery) {
    const today = dateOnly();
    const where: Prisma.LeadWhereInput = {};

    if (q.stage) where.stage = q.stage;
    if (q.type) where.type = q.type;

    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { place: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    // "Call these now" is new leads plus every follow-up whose date has arrived.
    if (q.bucket === 'due') {
      where.stage = { in: OPEN_STAGES };
      where.OR = [{ nextCall: null }, { nextCall: { lte: today } }];
    } else if (q.bucket === 'scheduled') {
      where.stage = { in: OPEN_STAGES };
      where.nextCall = { gt: today };
    } else if (q.bucket === 'lost') {
      where.stage = 'LOST';
    } else if (q.bucket === 'open') {
      where.stage = { in: OPEN_STAGES };
    }

    const [items, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: q.bucket === 'scheduled'
          ? [{ nextCall: 'asc' }]
          : [{ nextCall: 'asc' }, { createdAt: 'asc' }],
        take: q.take ?? 200,
        skip: q.skip ?? 0,
      }),
      prisma.lead.count({ where }),
    ]);

    return { items, total };
  }

  /** The three buckets the Lead screen renders, in one round trip. */
  async board() {
    const [due, scheduled, lost] = await Promise.all([
      this.list({ bucket: 'due' }),
      this.list({ bucket: 'scheduled' }),
      this.list({ bucket: 'lost', take: 100 }),
    ]);
    return { due: due.items, scheduled: scheduled.items, lost: lost.items };
  }

  /** Pipeline board grouped by stage. */
  async pipeline() {
    const leads = await prisma.lead.findMany({
      include: LEAD_INCLUDE,
      orderBy: { stageAt: 'desc' },
    });
    const lanes: Record<LeadStage, typeof leads> = {} as never;
    for (const stage of Object.values(LeadStage)) lanes[stage] = [];
    for (const lead of leads) lanes[lead.stage].push(lead);
    return lanes;
  }

  async get(id: string) {
    const lead = await prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    if (!lead) throw new NotFound('That lead no longer exists.');
    return lead;
  }

  // ---------------------------------------------------------------- writing

  create(dto: CreateLeadDto, userId: string) {
    return prisma.lead.create({
      data: { ...dto, ownerId: dto.ownerId ?? userId },
      include: LEAD_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.get(id);
    return prisma.lead.update({ where: { id }, data: dto, include: LEAD_INCLUDE });
  }

  async importMany(dto: ImportLeadsDto, userId: string) {
    let rows = dto.rows;

    if (dto.skipDuplicates) {
      const phones = rows.map((r) => r.phone).filter(Boolean) as string[];
      const existing = await prisma.lead.findMany({
        where: { phone: { in: phones } },
        select: { phone: true },
      });
      const seen = new Set(existing.map((e) => e.phone));
      rows = rows.filter((r) => !r.phone || !seen.has(r.phone));
    }

    const created = await prisma.lead.createMany({
      data: rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        place: r.place,
        type: r.type ?? 'KITCHEN',
        source: r.source ?? 'WALKIN',
        budgetNote: r.budgetNote,
        value: r.value ?? 0,
        ownerId: userId,
      })),
    });

    return { imported: created.count, skipped: dto.rows.length - created.count };
  }

  /** Duplicate check for the add-lead form. */
  async findByPhone(phone: string) {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length < 10) return [];
    return prisma.lead.findMany({
      where: { phone: { contains: digits } },
      select: { id: true, name: true, place: true, stage: true, createdAt: true },
      take: 5,
    });
  }

  markWhatsappSent(id: string) {
    return prisma.lead.update({
      where: { id },
      data: { waFirstAt: new Date() },
      select: { id: true, waFirstAt: true },
    });
  }

  // ------------------------------------------------------------------ calls

  /**
   * The heart of the pipeline. Nothing else moves a lead's stage.
   * Every open stage must leave with a next call date booked.
   */
  async logCall(leadId: string, dto: LogCallDto, userId: string) {
    const lead = await this.get(leadId);

    const closing = dto.stage === 'WON' || dto.stage === 'LOST';
    if (!closing && !dto.nextCall) {
      throw new BadRequest('Book the next call date. Every open lead must have one.');
    }
    if (dto.stage === 'LOST' && !dto.lostReason) {
      throw new BadRequest('Pick a reason before marking this lead lost.');
    }
    if (dto.stage === 'NEW') {
      throw new BadRequest('A call has happened, so the lead cannot go back to New.');
    }

    const nextCall = closing || !dto.nextCall ? null : dateOnly(new Date(dto.nextCall));
    const furthest =
      stageIndex(lead.furthest) > stageIndex(dto.stage) ? lead.furthest : dto.stage;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.call.create({
        data: { leadId, userId, remarks: dto.remarks, stage: dto.stage, nextCall },
      });

      return tx.lead.update({
        where: { id: leadId },
        data: {
          stage: dto.stage,
          furthest,
          stageAt: dto.stage === lead.stage ? lead.stageAt : new Date(),
          nextCall,
          lostReason: dto.stage === 'LOST' ? dto.lostReason : null,
          ...(dto.value !== undefined ? { value: dto.value } : {}),
        },
        include: LEAD_INCLUDE,
      });
    });

    // Winning a lead opens the project, with its milestones already sized.
    if (dto.stage === 'WON') {
      await projectsService.createForLead(leadId);
      return this.get(leadId);
    }

    return updated;
  }

  /** A lost lead that comes back re-enters the call cycle today. */
  async reopen(id: string) {
    const lead = await this.get(id);
    if (isOpenStage(lead.stage)) return lead;

    await prisma.$transaction([
      prisma.call.create({
        data: {
          leadId: id,
          remarks: 'Lead reopened.',
          stage: 'CONTACTED',
          nextCall: dateOnly(),
        },
      }),
      prisma.lead.update({
        where: { id },
        data: {
          stage: 'CONTACTED',
          stageAt: new Date(),
          nextCall: dateOnly(),
          lostReason: null,
        },
      }),
    ]);

    return this.get(id);
  }

  /** Follow-up cadence used to suggest the next date: day 1, 3, 7, 15, 30. */
  suggestNextCall(callCount: number) {
    const cadence = [1, 3, 7, 15, 30];
    return addDays(new Date(), cadence[Math.min(callCount, cadence.length - 1)]);
  }
}

export const leadsService = new LeadsService();
