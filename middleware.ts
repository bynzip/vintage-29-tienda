import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Admin route data is read by the authenticated browser client and protected
  // by RLS. Shared admin layouts verify the session on entry, while mutations
  // verify it in their server actions. Avoid a remote Auth request for each
  // client-side RSC navigation and prefetch.
  if (request.method === "GET" && request.headers.get("RSC") === "1") {
    return NextResponse.next({ request });
  }

  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
