import { NextResponse, type NextRequest } from "next/server";
import { globalSearch } from "@/lib/data/search";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Backs the ⌘K command palette. Anonymous visitors are limited by IP. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({
      problems: [],
      solutions: [],
      categories: [],
      users: [],
      total: 0,
    });
  }

  const user = await getCurrentUser();
  const identifier =
    user?.id ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  const limit = await checkRateLimit("search", identifier);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Slow down a little." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const results = await globalSearch(query);
  return NextResponse.json(results);
}
