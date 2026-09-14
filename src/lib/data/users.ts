import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, type IUser } from "@/models";
import { asScalarString } from "@/lib/utils/sanitize-query";
import type { ProfileDTO } from "@/types";
import { toProfileDTO } from "./serialize";

export async function getProfileByUsername(
  username: string
): Promise<ProfileDTO | null> {
  const safe = asScalarString(username, 30);
  if (!safe) return null;

  await connectToDatabase();
  const doc = await User.findOne({ username: safe.toLowerCase() })
    .lean<IUser>()
    .exec();

  return doc ? toProfileDTO(doc) : null;
}

export async function listAllUsernames(
  limit = 5000
): Promise<Array<{ username: string; updatedAt: Date }>> {
  await connectToDatabase();
  const docs = await User.find(
    { status: "active" },
    { username: 1, updatedAt: 1 }
  )
    .sort({ reputation: -1 })
    .limit(limit)
    .lean()
    .exec();
  return docs.map((d) => ({ username: d.username, updatedAt: d.updatedAt }));
}
