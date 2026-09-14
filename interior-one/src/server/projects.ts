import { BadRequest, NotFound } from '@/lib/errors';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/db';
import { addDays, dateOnly, MILESTONES } from './constants';
import type { PaymentDto, SetStepDto, UpdateProjectDto } from './schemas';

const PROJECT_INCLUDE = {
  lead: { select: { id: true, name: true, phone: true, place: true, type: true } },
  quote: { select: { id: true, no: true } },
  coordinator: { select: { id: true, name: true } },
  steps: { orderBy: { step: 'asc' as const } },
  payments: true,
};

export class ProjectsService {

  list() {
    return prisma.project.findMany({
      include: PROJECT_INCLUDE,
      orderBy: [{ step: 'asc' }, { promisedDate: 'asc' }],
    });
  }

  async get(id: string) {
    const p = await prisma.project.findUnique({ where: { id }, include: PROJECT_INCLUDE });
    if (!p) throw new NotFound('That project no longer exists.');
    return p;
  }

  /**
   * Called when a lead is won. Sizes the four milestones off the contract
   * value and opens the first delivery step.
   */
  async createForLead(leadId: string, quoteId?: string) {
    const existing = await prisma.project.findUnique({ where: { leadId } });
    if (existing) return existing;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFound('That lead no longer exists.');

    const today = dateOnly();
    const value = new Decimal(lead.value.toString());

    return prisma.project.create({
      data: {
        leadId,
        quoteId,
        client: lead.name,
        type: lead.type,
        value: value.toString(),
        step: 0,
        promisedDate: addDays(new Date(), 40),
        steps: { create: [{ step: 0, reachedAt: today }] },
        payments: {
          create: MILESTONES.map((m) => ({
            key: m.key,
            pct: m.pct,
            amount: value.times(m.pct).div(100).toDecimalPlaces(2).toString(),
            dueAt: m.atStep === 0 ? today : null,
          })),
        },
      },
      include: PROJECT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.get(id);
    return prisma.project.update({
      where: { id },
      data: {
        pressingUnit: dto.pressingUnit,
        coordinatorId: dto.coordinatorId,
        promisedDate: dto.promisedDate ? dateOnly(new Date(dto.promisedDate)) : undefined,
      },
      include: PROJECT_INCLUDE,
    });
  }

  /**
   * Moving to a step stamps every step up to it, and makes any milestone
   * hanging off those steps due. Stepping back clears what is no longer true.
   */
  async setStep(id: string, dto: SetStepDto) {
    const project = await this.get(id);
    const today = dateOnly();

    await prisma.$transaction(async (tx) => {
      await tx.projectStep.deleteMany({ where: { projectId: id, step: { gt: dto.step } } });

      for (let s = 0; s <= dto.step; s++) {
        await tx.projectStep.upsert({
          where: { projectId_step: { projectId: id, step: s } },
          update: {},
          create: { projectId: id, step: s, reachedAt: today },
        });
      }

      for (const m of MILESTONES) {
        const due = m.atStep <= dto.step;
        await tx.payment.update({
          where: { projectId_key: { projectId: id, key: m.key } },
          data: due ? { dueAt: { set: undefined } } : { dueAt: null, receivedAt: null },
        });
        if (due) {
          const existing = await tx.payment.findUnique({
            where: { projectId_key: { projectId: id, key: m.key } },
          });
          if (!existing?.dueAt) {
            await tx.payment.update({
              where: { projectId_key: { projectId: id, key: m.key } },
              data: { dueAt: today },
            });
          }
        }
      }

      await tx.project.update({
        where: { id },
        data: {
          step: dto.step,
          handoverDate: dto.step >= 6 ? (project.handoverDate ?? today) : null,
        },
      });
    });

    return this.get(id);
  }

  async setPayment(id: string, dto: PaymentDto) {
    const payment = await prisma.payment.findUnique({
      where: { projectId_key: { projectId: id, key: dto.key } },
    });
    if (!payment) throw new NotFound('That milestone does not exist on this project.');
    if (!payment.dueAt && dto.receivedAt) {
      throw new BadRequest('That milestone is not due yet.');
    }

    await prisma.payment.update({
      where: { projectId_key: { projectId: id, key: dto.key } },
      data: { receivedAt: dto.receivedAt ? dateOnly(new Date(dto.receivedAt)) : null },
    });

    return this.get(id);
  }

  /**
   * Deleting a project sends the lead back to Negotiation with today as the
   * next call, so it re-enters the call cycle instead of vanishing.
   * Quotations on the lead are kept.
   */
  async remove(id: string) {
    const project = await this.get(id);
    const today = dateOnly();

    await prisma.$transaction([
      prisma.project.delete({ where: { id } }),
      prisma.call.create({
        data: {
          leadId: project.leadId,
          remarks: 'Project cancelled and removed. Back to follow-up.',
          stage: 'NEGOTIATION',
          nextCall: today,
        },
      }),
      prisma.lead.update({
        where: { id: project.leadId },
        data: { stage: 'NEGOTIATION', stageAt: new Date(), nextCall: today },
      }),
    ]);

    return { ok: true, leadId: project.leadId };
  }
}

export const projectsService = new ProjectsService();
