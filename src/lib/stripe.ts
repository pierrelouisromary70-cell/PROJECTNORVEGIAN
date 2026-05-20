import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
});

export const PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
export const TRIAL_DAYS = 14;
