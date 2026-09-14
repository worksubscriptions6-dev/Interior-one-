import { Decimal } from 'decimal.js';

export interface QuoteItemLike {
  qty: Decimal | number | string;
  cost: Decimal | number | string;
  markupPct: Decimal | number | string;
}

export interface QuoteLike {
  showOffer: boolean;
  offerPct: number;
  gstPct: number;
  rooms: { items: QuoteItemLike[] }[];
}

export interface QuoteTotals {
  cost: number;      // what the work costs us
  subtotal: number;  // client price before GST
  gst: number;
  grand: number;     // what the client pays
  list: number;      // inflated "before discount" figure, or subtotal when no offer is shown
  margin: number;
  marginPct: number;
}

export const lineCost = (it: QuoteItemLike) => new Decimal(it.qty).times(it.cost);

export const linePrice = (it: QuoteItemLike) =>
  lineCost(it).times(new Decimal(1).plus(new Decimal(it.markupPct).div(100))).toDecimalPlaces(0);

/**
 * A 35% mark-up is a 26% margin, and a 45% mark-up is a 31% margin.
 * The discount, when shown, is worked backwards from the price we actually
 * want, so the margin never moves.
 */
export function quoteTotals(q: QuoteLike): QuoteTotals {
  let cost = new Decimal(0);
  let subtotal = new Decimal(0);

  for (const room of q.rooms ?? []) {
    for (const item of room.items ?? []) {
      cost = cost.plus(lineCost(item));
      subtotal = subtotal.plus(linePrice(item));
    }
  }

  const gst = subtotal.times(q.gstPct ?? 0).div(100).toDecimalPlaces(0);
  const grand = subtotal.plus(gst);

  const off = q.offerPct ?? 0;
  const list =
    q.showOffer && off > 0 && off < 80
      ? subtotal.div(new Decimal(1).minus(new Decimal(off).div(100))).toDecimalPlaces(0)
      : subtotal;

  const margin = subtotal.minus(cost);
  const marginPct = subtotal.isZero() ? new Decimal(0) : margin.div(subtotal).times(100);

  return {
    cost: cost.toNumber(),
    subtotal: subtotal.toNumber(),
    gst: gst.toNumber(),
    grand: grand.toNumber(),
    list: list.toNumber(),
    margin: margin.toNumber(),
    marginPct: Math.round(marginPct.toNumber()),
  };
}

/** The margin percentage a mark-up translates into. */
export const marginFromMarkup = (markupPct: number) =>
  Math.round((markupPct / (100 + markupPct)) * 100);
