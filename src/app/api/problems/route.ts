import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProblems } from "@/lib/data/problems";
import { checkRateLimit } from "@/lib/rate-limit";
import { problemFiltersSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Paginated feed data for the mobile infinite scroller. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const identifier =
    user?.id ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = await checkRateLimit("search", identifier);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Slow down a little." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const params = request.nextUrl.searchParams;
  const filters = problemFiltersSchema.parse({
    sort: params.get("sort") ?? undefined,
    category: params.get("category") ?? undefined,
    status: params.get("status") ?? undefined,
    country: params.get("country") ?? undefined,
    scope: params.get("scope") ?? undefined,
    q: params.get("q") ?? undefined,
    page: params.get("page") ?? undefined,
  });

  return NextResponse.json(await listProblems(filters), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
