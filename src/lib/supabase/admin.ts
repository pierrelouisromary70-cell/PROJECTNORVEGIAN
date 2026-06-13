import 'server-only';
import { createServerClient } from '@supabase/ssr';

/**
 * Service-role Supabase client for non-user-scoped server work (webhooks,
 * cron jobs). Bypasses RLS — never expose to the browser.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
