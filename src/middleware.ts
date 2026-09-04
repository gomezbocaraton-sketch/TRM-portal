import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const env = readSupabaseEnv();

  // Misconfigured? Show the setup page rather than crashing the request.
  if (!env.ok) {
    if (path === "/setup") return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.rewrite(url);
  }
  // Configured correctly — /setup has nothing to say.
  if (path === "/setup") {
    const url = request.nextUrl.clone();
    url.pathname = "/quotes";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user && path !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user && path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/quotes";
      return NextResponse.redirect(url);
    }
    return response;
  } catch (err) {
    // Never 500 the whole site over a session lookup. Send the visitor to
    // the login page, where a failure is visible and recoverable.
    console.error("[middleware] session check failed:", err);
    if (path === "/login") return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
