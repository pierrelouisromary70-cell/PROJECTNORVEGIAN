import Stripe from 'stripe';

// Lazily instantiate the Stripe client so merely importing this module (e.g.
// during `next build` page-data collection, or in an environment without
// billing configured) never throws. The real client is built on first use,
// when STRIPE_SECRET_KEY is expected to be present; routes surface a clear
// error at request time if it isn't.
let _stripe: Stripe | null = null;
function client(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    const c = client();
    const value = c[prop as keyof Stripe];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
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
