import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: 'no_customer' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}`,
  });
  return NextResponse.json({ url: portal.url });
}
