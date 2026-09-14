import { z } from 'zod';
import { LeadSource, LeadStage, MilestoneKey, QuoteStatus, Role, Unit, WorkType } from '@prisma/client';

const enumOf = <T extends Record<string, string>>(e: T) =>
  z.nativeEnum(e as unknown as Record<string, string>) as unknown as z.ZodType<T[keyof T]>;

/* ------------------------------------------------------------------ leads */

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
  place: z.string().trim().max(120).optional(),
  type: enumOf(WorkType),
  source: enumOf(LeadSource),
  budgetNote: z.string().trim().max(120).optional(),
  ownerId: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  value: z.number().min(0).optional(),
});

/**
 * Logging a call is the only way a lead changes stage. Remarks and the
 * resulting stage are always required; a next call date is required for every
 * open stage, and a reason is required to mark a lead lost.
 */
export const logCallSchema = z
  .object({
    remarks: z.string().trim().min(3, 'Write what was said before saving the call.'),
    stage: enumOf(LeadStage),
    nextCall: z.string().datetime().or(z.string().date()).optional(),
    lostReason: z.string().trim().max(120).optional(),
    value: z.number().min(0).optional(),
  })
  .refine((d) => d.stage !== 'NEW', {
    message: 'A call has happened, so the lead cannot go back to New.',
    path: ['stage'],
  })
  .refine((d) => d.stage === 'WON' || d.stage === 'LOST' || !!d.nextCall, {
    message: 'Book the next call date. Every open lead must have one.',
    path: ['nextCall'],
  })
  .refine((d) => d.stage !== 'LOST' || !!d.lostReason, {
    message: 'Pick a reason before marking this lead lost.',
    path: ['lostReason'],
  });

export const importLeadsSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(2),
        phone: z.string().trim().optional(),
        place: z.string().trim().optional(),
        type: enumOf(WorkType).optional(),
        source: enumOf(LeadSource).optional(),
        budgetNote: z.string().trim().optional(),
        value: z.number().min(0).optional(),
      }),
    )
    .max(2000),
  skipDuplicates: z.boolean().optional(),
});

export const listLeadsSchema = z.object({
  stage: enumOf(LeadStage).optional(),
  type: enumOf(WorkType).optional(),
  search: z.string().optional(),
  bucket: z.enum(['due', 'scheduled', 'lost', 'open', 'all']).optional(),
  take: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

/* ----------------------------------------------------------------- quotes */

export const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Pick a lead this quotation belongs to.'),
  firstRoomName: z.string().trim().max(60).optional(),
});

export const updateQuoteSchema = z.object({
  client: z.string().trim().max(120).optional(),
  place: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(20).optional(),
  date: z.string().optional(),
  validityDays: z.number().int().min(1).max(180).optional(),
  preparedById: z.string().optional(),
  showOffer: z.boolean().optional(),
  offerPct: z.number().int().min(0).max(79).optional(),
  gstPct: z.number().int().min(0).max(40).optional(),
  status: enumOf(QuoteStatus).optional(),
  notes: z.string().max(2000).optional(),
});

export const roomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  position: z.number().int().optional(),
});

export const itemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  spec: z.string().trim().max(600).optional(),
  unit: enumOf(Unit).optional(),
  size: z.string().trim().max(40).optional(),
  qty: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  markupPct: z.number().min(0).max(500).optional(),
  position: z.number().int().optional(),
});

export const itemFromRateSchema = z.object({
  rateItemId: z.string().min(1),
  qty: z.number().min(0).optional(),
});

/* --------------------------------------------------------------- projects */

export const updateProjectSchema = z.object({
  pressingUnit: z.string().trim().max(120).optional(),
  promisedDate: z.string().optional(),
  coordinatorId: z.string().optional(),
});

export const setStepSchema = z.object({ step: z.number().int().min(0).max(6) });

export const paymentSchema = z.object({
  key: enumOf(MilestoneKey),
  receivedAt: z.string().optional(),
});

/* --------------------------------------------------------------- settings */

export const rateItemSchema = z.object({
  group: z.string().trim().max(60),
  name: z.string().trim().max(120),
  spec: z.string().trim().max(600).optional(),
  unit: enumOf(Unit),
  cost: z.number().min(0),
  markupPct: z.number().min(0).max(500),
});

export const spendSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  campaign: z.enum(['kitchen', 'fullhome', 'ceiling', 'commercial']),
  amount: z.number().min(0),
});

export const targetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  revenue: z.number().min(0),
});

export const settingSchema = z.object({ key: z.string().min(1), value: z.unknown() });

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8),
  role: enumOf(Role),
});

/* ------------------------------------------------------------------ types */

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type LogCallDto = z.infer<typeof logCallSchema>;
export type ImportLeadsDto = z.infer<typeof importLeadsSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsSchema>;
export type CreateQuoteDto = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteDto = z.infer<typeof updateQuoteSchema>;
export type RoomDto = z.infer<typeof roomSchema>;
export type ItemDto = z.infer<typeof itemSchema>;
export type ItemFromRateDto = z.infer<typeof itemFromRateSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type SetStepDto = z.infer<typeof setStepSchema>;
export type PaymentDto = z.infer<typeof paymentSchema>;
export type RateItemDto = z.infer<typeof rateItemSchema>;
export type SpendDto = z.infer<typeof spendSchema>;
export type TargetDto = z.infer<typeof targetSchema>;
export type SettingDto = z.infer<typeof settingSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
