import { NextResponse, type NextRequest } from "next/server";
import {
  AVATAR_STYLES,
  generatedAvatarSvg,
  type AvatarStyle,
} from "@/lib/avatar";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const runtime = "nodejs";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ style: string }> },
) {
  const { style } = await params;
  const seed = request.nextUrl.searchParams.get("seed");
  if (!seed || seed.length > 120 || !AVATAR_STYLES.includes(style as AvatarStyle)) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(generatedAvatarSvg(seed, style as AvatarStyle), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
