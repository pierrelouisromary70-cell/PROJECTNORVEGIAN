import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { stripe, priceIdFor } from '@/lib/stripe';

const bodySchema = z.object({
  locale: z.enum(['fr', 'en']).default('fr'),
  plan: z.enum(['monthly', 'annual']).default('monthly'),
}).default({ locale: 'fr', plan: 'monthly' });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { locale, plan } = parsed.data;

  const priceId = priceIdFor(plan);
  if (!priceId) {
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
  let customerId = sub?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_user_id: user.id } });
    customerId = customer.id;
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      status: sub?.status ?? 'trialing',
      trial_end: sub?.trial_end ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // Only offer Stripe-side trial days if the user has not exhausted theirs.
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const remainingTrialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: remainingTrialDays > 0 ? { trial_period_days: remainingTrialDays } : undefined,
    success_url: `${origin}/${locale}/dashboard?upgraded=1`,
    cancel_url: `${origin}/${locale}/profile`,
    allow_promotion_codes: true,
    metadata: { plan, user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
