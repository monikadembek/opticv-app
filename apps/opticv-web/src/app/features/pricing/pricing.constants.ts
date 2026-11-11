import type { SubscriptionTier } from '@opticv/datatypes';

export type PlanDescriptor = {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
};

export const PLANS: readonly PlanDescriptor[] = [
  {
    tier: 'FREE',
    name: 'Free',
    tagline: 'Everything you need to get started.',
    monthlyPrice: 0,
  },
  {
    tier: 'BASIC',
    name: 'Basic',
    tagline: 'For regular job seekers.',
    monthlyPrice: 9.9,
  },
  {
    tier: 'PRO',
    name: 'Pro',
    tagline: 'For serious job seekers.',
    monthlyPrice: 19.9,
  },
];

export const INCLUDED_FEATURES: readonly string[] = [
  'AI resume autopsy & keyword gap analysis',
  'Summary rewrites & stronger bullet points',
  'Cover letter generator',
  'Interview prep guide',
  'LinkedIn profile content',
  'PDF + DOCX export',
];
