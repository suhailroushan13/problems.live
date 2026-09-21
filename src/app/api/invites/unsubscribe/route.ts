import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import { Invite } from "@/models";
import { hashInviteToken } from "@/lib/utils/invite-token";

export const dynamic = "force-dynamic";

function destination(token: string, status: "unsubscribed" | "unavailable"): URL {
  return new URL(`/unsubscribe/invitation/${token}?status=${status}`, env.appUrl);
}

export async function POST(request: NextRequest) {
  let token: FormDataEntryValue | null = request.nextUrl.searchParams.get("token");

  // Browser footer forms carry the token in the body. Mail clients using the
  // RFC 8058 one-click header send it in the query string and may not include
  // a form-encoded body at all.
  if (!token) {
    try {
      token = (await request.formData()).get("token");
    } catch {
      token = null;
    }
  }

  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,}$/.test(token)) {
    return NextResponse.redirect(new URL("/unsubscribe/invitation/invalid?status=unavailable", env.appUrl), 303);
  }

  await connectToDatabase();
  const invite = await Invite.findOneAndUpdate(
    { tokenHash: hashInviteToken(token), type: "email", status: "pending" },
    { $set: { status: "cancelled" } },
    { new: true },
  ).lean().exec();

  return NextResponse.redirect(destination(token, invite ? "unsubscribed" : "unavailable"), 303);
}
