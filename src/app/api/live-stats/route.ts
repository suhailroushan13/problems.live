import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SiteVisit } from "@/models";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE = "pl_visitor";
const ONLINE_WINDOW_MS = 75_000;

/**
 * Records one anonymous browser session and refreshes its presence heartbeat.
 * A browser is considered live while it has checked in during the last 75s.
 */
export async function POST(request: NextRequest) {
  const cookieVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = cookieVisitorId ?? randomUUID();
  const now = new Date();

  try {
    await connectToDatabase();
    await SiteVisit.updateOne(
      { visitorId },
      {
        $set: { lastSeenAt: now },
        $setOnInsert: { firstSeenAt: now },
      },
      { upsert: true, setDefaultsOnInsert: true }
    ).exec();

    const [totalVisits, livePeople] = await Promise.all([
      SiteVisit.countDocuments({}).exec(),
      SiteVisit.countDocuments({
        lastSeenAt: { $gte: new Date(now.getTime() - ONLINE_WINDOW_MS) },
      }).exec(),
    ]);

    const response = NextResponse.json({ totalVisits, livePeople });
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
    console.error("[live-stats] failed to record presence", error);
    return NextResponse.json(
      { error: "Live stats are temporarily unavailable." },
      { status: 503 }
    );
  }
}
