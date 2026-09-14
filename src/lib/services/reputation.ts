import "server-only";
import { User } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { REPUTATION } from "@/lib/constants";
import { getSetting } from "@/lib/config/settings";

type StatKey =
  | "problems"
  | "solutions"
  | "comments"
  | "solvedProblems"
  | "helpfulVotes"
  | "validationsReceived";

/**
 * All reputation and counter mutations funnel through here so the values stay
 * server-authoritative and consistent. Uses atomic `$inc` — a read-modify-write
 * would lose updates under concurrent votes.
 */
export async function awardReputation(
  userId: string | null | undefined,
  amount: number,
  stat?: { key: StatKey; delta: number }
): Promise<void> {
  const id = toObjectId(userId);
  if (!id || (amount === 0 && !stat)) return;

  const inc: Record<string, number> = {};
  if (amount !== 0) inc.reputation = amount;
  if (stat) inc[`stats.${stat.key}`] = stat.delta;

  try {
    await User.updateOne({ _id: id }, { $inc: inc }).exec();
    // Reputation is a floor-zero score; a run of removals should not bury
    // someone permanently below zero.
    if (amount < 0) {
      await User.updateOne(
        { _id: id, reputation: { $lt: 0 } },
        { $set: { reputation: 0 } }
      ).exec();
    }
  } catch (error) {
    console.error("[reputation] update failed", error);
  }
}

export const REPUTATION_VALUES = REPUTATION;

/** Spend one problem credit. Returns false when the author has none left. */
export async function consumeProblemCredit(userId: string): Promise<boolean> {
  const id = toObjectId(userId);
  if (!id) return false;

  const result = await User.findOneAndUpdate(
    { _id: id, problemCredits: { $gt: 0 } },
    { $inc: { problemCredits: -1 } },
    { returnDocument: "after" }
  )
    .lean()
    .exec();

  return Boolean(result);
}

export async function refundProblemCredit(userId: string): Promise<void> {
  const id = toObjectId(userId);
  if (!id) return;
  const max = await getSetting("maxProblemCredits");
  await User.updateOne(
    { _id: id, problemCredits: { $lt: max } },
    { $inc: { problemCredits: 1 } }
  ).exec();
}

/**
 * A problem that clears the validation bar proves it was worth posting, so the
 * author gets a credit back. Called once, when the threshold is crossed.
 */
export async function maybeRewardValidatedProblem(params: {
  authorId: string;
  validationCount: number;
}): Promise<void> {
  const [threshold, creditsPer] = await Promise.all([
    getSetting("validationsToEarnCredit"),
    getSetting("creditsPerValidatedProblem"),
  ]);

  if (params.validationCount !== threshold) return;

  const id = toObjectId(params.authorId);
  if (!id) return;

  const max = await getSetting("maxProblemCredits");
  await User.updateOne(
    { _id: id, problemCredits: { $lt: max } },
    { $inc: { problemCredits: creditsPer } }
  ).exec();
}
