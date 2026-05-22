import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
});

// Two plans. The legacy STRIPE_PRICE_ID env var is kept as a fallback for
// monthly so existing dev setups don't break, but new deployments should set
// both STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_ANNUAL.
export const PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID ?? '';
export const PRICE_ID_ANNUAL = process.env.STRIPE_PRICE_ID_ANNUAL ?? '';

export type PlanKey = 'monthly' | 'annual';
export function priceIdFor(plan: PlanKey): string {
  return plan === 'annual' ? PRICE_ID_ANNUAL : PRICE_ID_MONTHLY;
}

export const TRIAL_DAYS = 14;
export const PLAN_MONTHLY_EUR = 15;
export const PLAN_ANNUAL_EUR = 120;
