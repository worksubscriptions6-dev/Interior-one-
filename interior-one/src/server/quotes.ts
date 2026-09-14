import { BadRequest, Forbidden, NotFound } from '@/lib/errors';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { quoteTotals } from './quote-math';
import { dateOnly } from './constants';
import { projectsService } from './projects';
import type { CreateQuoteDto, ItemDto, ItemFromRateDto, RoomDto, UpdateQuoteDto } from './schemas';

const QUOTE_INCLUDE = {
  lead: { select: { id: true, name: true, phone: true, place: true, type: true, stage: true } },
  preparedBy: { select: { id: true, name: true } },
  rooms: {
    orderBy: { position: 'asc' as const },
    include: { items: { orderBy: { position: 'asc' as const } } },
  },
};

const ROOM_FOR_TYPE: Record<string, string> = {
  KITCHEN: 'Modular Kitchen',
  CEILING: 'False Ceiling',
  FULLHOME: 'Modular Kitchen',
  COMMERCIAL: 'Shop Floor',
};

export class QuotesService {

  // --------------------------------------------------------------- helpers

  /**
   * Cost and mark-up are the firm's business, not the client's and not the
   * telecaller's. Anyone who is not the owner or the coordinator gets the
   * quotation with those fields stripped.
   */
  private shape(quote: any, role: Role) {
    const totals = quoteTotals(quote);
    const seesCost = role === 'OWNER' || role === 'COORDINATOR';

    if (seesCost) return { ...quote, totals };

    return {
      ...quote,
      rooms: quote.rooms.map((r: any) => ({
        ...r,
        items: r.items.map(({ cost, markupPct, ...rest }: any) => rest),
      })),
      totals: {
        subtotal: totals.subtotal, gst: totals.gst,
        grand: totals.grand, list: totals.list,
      },
    };
  }

  private async nextNumber() {
    const year = new Date().getFullYear();
    const prefix = `IO-${year}-`;
    const count = await prisma.quote.count({ where: { base: { startsWith: prefix }, rev: 1 } });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  private async raw(id: string) {
    const q = await prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    if (!q) throw new NotFound('That quotation no longer exists.');
    return q;
  }

  private assertEditable(q: { status: string }) {
    if (q.status === 'ACCEPTED') {
      throw new Forbidden('An accepted quotation cannot be edited. Create a revision instead.');
    }
  }

  // ---------------------------------------------------------------- reading

  async list(role: Role) {
    const quotes = await prisma.quote.findMany({
      include: QUOTE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });
    return quotes.map((q) => this.shape(q, role));
  }

  async get(id: string, role: Role) {
    return this.shape(await this.raw(id), role);
  }

  async forLead(leadId: string, role: Role) {
    const quotes = await prisma.quote.findMany({
      where: { leadId },
      include: QUOTE_INCLUDE,
      orderBy: [{ base: 'desc' }, { rev: 'desc' }],
    });
    return quotes.map((q) => this.shape(q, role));
  }

  // ---------------------------------------------------------------- writing

  async create(dto: CreateQuoteDto, userId: string, role: Role) {
    const lead = await prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) throw new NotFound('Pick a lead this quotation belongs to.');

    const no = await this.nextNumber();
    const gst = Number((await prisma.setting.findUnique({ where: { key: 'gstPct' } }))?.value ?? 18);

    const quote = await prisma.quote.create({
      data: {
        no, base: no, rev: 1,
        leadId: lead.id,
        client: lead.name,
        place: lead.place,
        phone: lead.phone,
        date: dateOnly(),
        preparedById: userId,
        gstPct: gst,
        rooms: {
          create: [{
            name: dto.firstRoomName ?? ROOM_FOR_TYPE[lead.type] ?? 'Other Works',
            position: 0,
          }],
        },
      },
      include: QUOTE_INCLUDE,
    });

    return this.shape(quote, role);
  }

  /** A revision keeps the base number and the lead, and starts as a draft. */
  async revise(id: string, userId: string, role: Role) {
    const source = await this.raw(id);
    const base = source.base;

    const highest = await prisma.quote.aggregate({
      where: { base },
      _max: { rev: true },
    });
    const rev = (highest._max.rev ?? 1) + 1;

    const quote = await prisma.quote.create({
      data: {
        no: `${base} R${rev}`, base, rev,
        leadId: source.leadId,
        client: source.client,
        place: source.place,
        phone: source.phone,
        date: dateOnly(),
        validityDays: source.validityDays,
        preparedById: userId,
        showOffer: source.showOffer,
        offerPct: source.offerPct,
        gstPct: source.gstPct,
        notes: source.notes,
        rooms: {
          create: source.rooms.map((r) => ({
            name: r.name,
            position: r.position,
            items: {
              create: r.items.map((i) => ({
                position: i.position,
                description: i.description,
                spec: i.spec,
                unit: i.unit,
                size: i.size,
                qty: i.qty,
                cost: i.cost,
                markupPct: i.markupPct,
              })),
            },
          })),
        },
      },
      include: QUOTE_INCLUDE,
    });

    return this.shape(quote, role);
  }

  async update(id: string, dto: UpdateQuoteDto, role: Role) {
    const quote = await this.raw(id);
    if (dto.status !== 'ACCEPTED') this.assertEditable(quote);

    const updated = await prisma.quote.update({
      where: { id },
      data: { ...dto, date: dto.date ? dateOnly(new Date(dto.date)) : undefined },
      include: QUOTE_INCLUDE,
    });
    return this.shape(updated, role);
  }

  async remove(id: string) {
    const quote = await this.raw(id);
    if (quote.status === 'ACCEPTED') {
      throw new Forbidden('An accepted quotation cannot be deleted.');
    }
    await prisma.quote.delete({ where: { id } });
    return { ok: true };
  }

  // ------------------------------------------------------------ rooms/items

  async addRoom(id: string, dto: RoomDto, role: Role) {
    const quote = await this.raw(id);
    this.assertEditable(quote);
    await prisma.quoteRoom.create({
      data: { quoteId: id, name: dto.name, position: dto.position ?? quote.rooms.length },
    });
    return this.get(id, role);
  }

  async updateRoom(id: string, roomId: string, dto: RoomDto, role: Role) {
    this.assertEditable(await this.raw(id));
    await prisma.quoteRoom.update({ where: { id: roomId }, data: { name: dto.name } });
    return this.get(id, role);
  }

  async removeRoom(id: string, roomId: string, role: Role) {
    this.assertEditable(await this.raw(id));
    await prisma.quoteRoom.delete({ where: { id: roomId } });
    return this.get(id, role);
  }

  async addItem(id: string, roomId: string, dto: ItemDto, role: Role) {
    this.assertEditable(await this.raw(id));
    const count = await prisma.quoteItem.count({ where: { roomId } });
    await prisma.quoteItem.create({
      data: {
        roomId,
        position: dto.position ?? count,
        description: dto.description,
        spec: dto.spec,
        unit: dto.unit ?? 'NOS',
        size: dto.size,
        qty: dto.qty ?? 1,
        cost: dto.cost ?? 0,
        markupPct: dto.markupPct ?? 45,
      },
    });
    return this.get(id, role);
  }

  /** Drops a rate card line in with its cost, spec and mark-up already set. */
  async addItemFromRate(id: string, roomId: string, dto: ItemFromRateDto, role: Role) {
    const rate = await prisma.rateItem.findUnique({ where: { id: dto.rateItemId } });
    if (!rate) throw new NotFound('That rate card item no longer exists.');

    return this.addItem(id, roomId, {
      description: rate.name,
      spec: rate.spec ?? undefined,
      unit: rate.unit,
      qty: dto.qty ?? 1,
      cost: Number(rate.cost),
      markupPct: Number(rate.markupPct),
    }, role);
  }

  async updateItem(id: string, itemId: string, dto: ItemDto, role: Role) {
    this.assertEditable(await this.raw(id));
    await prisma.quoteItem.update({ where: { id: itemId }, data: dto });
    return this.get(id, role);
  }

  async removeItem(id: string, itemId: string, role: Role) {
    this.assertEditable(await this.raw(id));
    await prisma.quoteItem.delete({ where: { id: itemId } });
    return this.get(id, role);
  }

  // ----------------------------------------------------------------- accept

  /**
   * Accepting sets the lead's contract value, logs it as a call so it lands on
   * the timeline, moves the lead to Won and opens the project.
   */
  async accept(id: string, role: Role) {
    const quote = await this.raw(id);
    const totals = quoteTotals(quote);
    if (totals.grand <= 0) {
      throw new BadRequest('Add some items before accepting this quotation.');
    }

    await prisma.$transaction([
      prisma.quote.update({ where: { id }, data: { status: 'ACCEPTED' } }),
      prisma.lead.update({
        where: { id: quote.leadId },
        data: {
          value: totals.grand,
          stage: 'WON',
          furthest: 'WON',
          stageAt: new Date(),
          nextCall: null,
        },
      }),
      prisma.call.create({
        data: {
          leadId: quote.leadId,
          remarks: `Quotation ${quote.no} accepted at ${totals.grand} including GST.`,
          stage: 'WON',
        },
      }),
    ]);

    await projectsService.createForLead(quote.leadId, quote.id);
    return this.get(id, role);
  }
}

export const quotesService = new QuotesService();
