import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Permanently deletes the authenticated user's account and all associated data.
 * Triggered from the profile page. RGPD Article 17 ("right to be forgotten").
 */
export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service_role_not_configured' }, { status: 500 });
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // Don't surface Supabase's raw message to the client — it can leak
    // schema or RLS hints. Log it server-side instead.
    console.error('account_delete_failed', { uid: user.id, message: error.message });
    return NextResponse.json({ error: 'deletion_failed' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
