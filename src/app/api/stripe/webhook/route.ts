import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';

// Service-role client — webhooks are not user-scoped.
function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST(req: Request) {
  const sig = headers().get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = adminClient();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const { data: row } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (row?.user_id) {
        await supabase.from('subscriptions').update({
          stripe_subscription_id: sub.id,
          status: sub.status,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', row.user_id);
      }
      break;
    }
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.subscription && typeof cs.customer === 'string') {
        await supabase.from('subscriptions').update({
          stripe_subscription_id: cs.subscription as string,
          status: 'active',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', cs.customer);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
