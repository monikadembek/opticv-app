import {
  getEffectiveTier,
  TIER_LIMITS,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@opticv/datatypes';

export type CvTemplateId =
  | 'default'
  | 'classic'
  | 'modern'
  | 'corporate'
  | 'minimal'
  | 'impact';

export interface CvTemplate {
  id: CvTemplateId;
  name: string;
  description: string;
}

export const CV_TEMPLATES: CvTemplate[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Single column, bold accent bar, ATS-safe',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Single column, traditional, monochrome, ATS-safe',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Single column, accent underline headings, ATS-safe',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Single column, header band, ATS-safe',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Single column, ultra-clean, monochrome, ATS-safe',
  },
  {
    id: 'impact',
    name: 'Impact',
    description: 'Single column, bold color bands, ATS-safe',
  },
];

export type AccentColorId = 'emerald' | 'blue' | 'purple' | 'red' | 'teal';

export interface AccentColor {
  id: AccentColorId;
  name: string;
  hex: string;
}

export const CV_ACCENT_COLORS: AccentColor[] = [
  { id: 'emerald', name: 'Emerald', hex: '#059669' },
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'purple', name: 'Purple', hex: '#7c3aed' },
  { id: 'red', name: 'Red', hex: '#dc2626' },
  { id: 'teal', name: 'Teal', hex: '#0891b2' },
];

export const DEFAULT_ACCENT_COLOR = '#059669';

export const ACCENT_AWARE_TEMPLATE_IDS: CvTemplateId[] = [
  'default',
  'modern',
  'corporate',
  'impact',
];

export const DEFAULT_GDPR_CLAUSE =
  'I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR).';

export function getAllowedTemplateIds(
  subscription:
    | { tier: SubscriptionTier; status: SubscriptionStatus }
    | null
    | undefined,
): CvTemplateId[] {
  const tier = subscription
    ? getEffectiveTier(subscription.tier, subscription.status)
    : 'FREE';
  const allowed = TIER_LIMITS[tier].allowedTemplates;
  return allowed === 'ALL'
    ? CV_TEMPLATES.map((t) => t.id)
    : (allowed as CvTemplateId[]);
}
