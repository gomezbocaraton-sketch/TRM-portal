import { createBrowserClient } from '@supabase/ssr';

// Uses the public anon key — safe to ship to the browser.
// Row Level Security policies (see supabase/rls_policies.sql) are
// what actually restrict access, not this key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
