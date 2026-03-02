import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always redirect root to /reports
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/reports", req.url));
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = pathname.startsWith("/login");
  const isProtectedRoute = pathname.startsWith("/reports");

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/reports", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/", "/login", "/reports/:path*"],
};