import { LeadStage, MilestoneKey } from '@prisma/client';

/** Stage order. Anything before WON is an open lead. */
export const STAGE_ORDER: LeadStage[] = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'VISIT',
  'DESIGN', 'PRESENTED', 'NEGOTIATION', 'WON', 'LOST',
];

export const OPEN_STAGES: LeadStage[] = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'VISIT', 'DESIGN', 'PRESENTED', 'NEGOTIATION',
];

export const stageIndex = (s: LeadStage) => STAGE_ORDER.indexOf(s);
export const isOpenStage = (s: LeadStage) => OPEN_STAGES.includes(s);

/** The seven delivery steps. */
export const STEPS = [
  'Final measurement',
  'Drawings and cutting list',
  'Released to pressing unit',
  'In production',
  'Delivered to site',
  'Fixing and quality gate',
  'Handed over',
];

/** Payment milestones and the delivery step each one falls due at. */
export const MILESTONES: { key: MilestoneKey; label: string; pct: number; atStep: number }[] = [
  { key: 'TOKEN',      label: 'Design token',       pct: 10, atStep: 0 },
  { key: 'PRODUCTION', label: 'Production release', pct: 40, atStep: 2 },
  { key: 'DELIVERY',   label: 'Delivery to site',   pct: 40, atStep: 4 },
  { key: 'HANDOVER',   label: 'Handover',           pct: 10, atStep: 6 },
];

export const CAMPAIGNS = [
  { id: 'kitchen',    source: 'AD_KITCHEN',    label: 'Modular kitchen',    targetCpl: 400 },
  { id: 'fullhome',   source: 'AD_FULLHOME',   label: 'Full home interior', targetCpl: 700 },
  { id: 'ceiling',    source: 'AD_CEILING',    label: 'False ceiling',      targetCpl: 250 },
  { id: 'commercial', source: 'AD_COMMERCIAL', label: 'Commercial',         targetCpl: 600 },
] as const;

export const SETTING_KEYS = {
  waFirst: 'waFirst',
  breakEven: 'breakEven',
  gstPct: 'gstPct',
  markupFloor: 'markupFloor',
  markupTarget: 'markupTarget',
} as const;

export const WA_DEFAULT =
  'Hello {name}, this is {sender} from Interior One, Karunagappally.\n\n' +
  'Thank you for your enquiry about {type}. We are an architect-led interior studio — ' +
  'we design around your home instead of fitting it into a catalogue, and we stay with you ' +
  'through flooring, lighting, colour and furniture as well.\n\n' +
  'Could I know a little about what you have in mind, and when the site will be ready? ' +
  'I can arrange a visit from our architect at a time that suits you.';

/** Date-only value, which is what nextCall and milestone dates use. */
export const dateOnly = (d: Date = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const addDays = (d: Date, n: number) => {
  const x = dateOnly(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);
