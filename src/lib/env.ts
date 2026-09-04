/** Supabase configuration, validated once and reported clearly.
 *
 *  A missing or malformed variable used to crash the middleware, which
 *  Vercel surfaces as an opaque MIDDLEWARE_INVOCATION_FAILED. Now the
 *  app checks first and shows /setup instead.
 */

export type EnvProblem = { key: string; problem: string };

/** Supabase shows several addresses. The one this app needs ends at
 *  `.supabase.co` — trim the REST path if it was copied by mistake. */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function readSupabaseEnv(): {
  url: string;
  anonKey: string;
  ok: boolean;
  problems: EnvProblem[];
} {
  const problems: EnvProblem[] = [];
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";

  if (!rawUrl) {
    problems.push({
      key: "NEXT_PUBLIC_SUPABASE_URL",
      problem: "Not set. Add it in Vercel under Settings → Environment Variables, then redeploy.",
    });
  } else {
    let parsed: URL | null = null;
    try { parsed = new URL(url); } catch { parsed = null; }
    if (!parsed) {
      problems.push({
        key: "NEXT_PUBLIC_SUPABASE_URL",
        problem: "Not a valid URL. It should look like https://yourproject.supabase.co",
      });
    } else if (parsed.protocol !== "https:") {
      problems.push({ key: "NEXT_PUBLIC_SUPABASE_URL", problem: "Must start with https://" });
    } else if (!parsed.hostname.endsWith(".supabase.co")) {
      problems.push({
        key: "NEXT_PUBLIC_SUPABASE_URL",
        problem: `Host is "${parsed.hostname}", which is not a Supabase project URL. Copy the Project URL from Settings → API.`,
      });
    }
  }

  if (!anonKey) {
    problems.push({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      problem: "Not set. Add it in Vercel under Settings → Environment Variables, then redeploy.",
    });
  } else if (anonKey.length < 40) {
    problems.push({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      problem: `Only ${anonKey.length} characters — that is too short to be the anon key. It is a long string starting "eyJ".`,
    });
  }

  return { url, anonKey, ok: problems.length === 0, problems };
}
