import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { ImageValidationError, uploadImages } from "@/lib/image";
import { MAX_IMAGES_PER_POST } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["problems", "solutions", "avatars"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to upload images." },
      { status: 401 }
    );
  }
  if (user.isSuspended) {
    return NextResponse.json(
      { error: "Your account is suspended." },
      { status: 403 }
    );
  }

  const limit = await checkRateLimit("upload", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const form = await request.formData();
    const folderInput = String(form.get("folder") ?? "problems");
    const folder = ALLOWED_FOLDERS.has(folderInput) ? folderInput : "problems";

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files received." }, { status: 400 });
    }
    if (files.length > MAX_IMAGES_PER_POST) {
      return NextResponse.json(
        { error: `Attach at most ${MAX_IMAGES_PER_POST} images.` },
        { status: 400 }
      );
    }

    const images = await uploadImages({ files, folder, ownerId: user.id });
    return NextResponse.json({ images });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[upload] failed", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
