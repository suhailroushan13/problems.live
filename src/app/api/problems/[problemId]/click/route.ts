import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Problem, ProblemClick } from "@/models";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toObjectId } from "@/lib/utils/sanitize-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE = "pl_visitor";

/**
 * Records a card-to-problem navigation. The counter makes list rendering
 * inexpensive; the event collection preserves every click and its actor for
 * reporting/admin use without exposing clickers on public cards.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ problemId: string }> },
) {
  const { problemId: rawProblemId } = await context.params;
  const problemId = toObjectId(rawProblemId);
  if (!problemId) {
    return NextResponse.json(
      { error: "That problem is not available." },
      { status: 404 },
    );
  }

  const cookieVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = cookieVisitorId ?? randomUUID();

  try {
    const user = await getCurrentUser();
    await enforceRateLimit("problem:click", user?.id ?? visitorId);
    await connectToDatabase();

    // Count only publicly visible problems, so a guessed ID cannot create
    // telemetry for held or removed content.
    const problem = await Problem.findOneAndUpdate(
      { _id: problemId, moderationStatus: "approved" },
      { $inc: { viewCount: 1 } },
      { new: false },
    )
      .lean()
      .exec();

    if (!problem)
      return NextResponse.json(
        { error: "That problem is not available." },
        { status: 404 },
      );

    await ProblemClick.create({
      problemId,
      userId: user ? toObjectId(user.id) : null,
      visitorId,
    });

    const response = new NextResponse(null, { status: 204 });
    if (!cookieVisitorId) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch (error) {
    console.error("[problem-click] failed to record click", error);
    return NextResponse.json(
      { error: "Click tracking is temporarily unavailable." },
      { status: 503 },
    );
  }
}
