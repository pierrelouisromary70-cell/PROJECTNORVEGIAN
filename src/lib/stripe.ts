import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-09-30.acacia',
});

export const PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
export const TRIAL_DAYS = 30;
