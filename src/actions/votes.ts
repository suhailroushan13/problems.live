"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Comment,
  CommentAward,
  CommentVote,
  Problem,
  ProblemBookmark,
  ProblemValidation,
  Solution,
  SolutionVote,
  computeHotScore,
  problemSignal,
  type VoteDirection,
} from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import { enforceRateLimit } from "@/lib/rate-limit";
import { objectId } from "@/lib/utils/sanitize-query";
import {
  awardReputation,
  maybeRewardValidatedProblem,
} from "@/lib/services/reputation";
import { notify, notifyProblemMilestone } from "@/lib/services/notify";
import {
  NotFoundError,
  isDuplicateKeyError,
  ok,
  toActionError,
} from "@/lib/action-helpers";
import { REPUTATION } from "@/lib/constants";
import type { ActionResult } from "@/types";

export interface VoteState {
  count: number;
  active: boolean;
}

export interface BookmarkState {
  count: number;
  active: boolean;
}

/**
 * Toggle a private saved-problem relationship. Only the aggregate count is
 * stored on the public problem document; the identity of bookmarkers never
 * leaves this server action.
 */
export async function toggleProblemBookmark(
  problemId: string
): Promise<ActionResult<BookmarkState>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("bookmark", user.id);
    await connectToDatabase();

    const pid = objectId(problemId);
    const uid = objectId(user.id);
    const problem = await Problem.findOne(
      { _id: pid, moderationStatus: "approved" },
      { slug: 1 }
    )
      .lean()
      .exec();
    if (!problem) throw new NotFoundError("That problem is not available.");

    let active: boolean;
    try {
      await ProblemBookmark.create({ problemId: pid, userId: uid });
      active = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      await ProblemBookmark.deleteOne({ problemId: pid, userId: uid }).exec();
      active = false;
    }

    const updated = await Problem.findOneAndUpdate(
      { _id: pid },
      { $inc: { bookmarkCount: active ? 1 : -1 } },
      { returnDocument: "after", projection: { bookmarkCount: 1 } }
    )
      .lean()
      .exec();
    const count = Math.max(0, updated?.bookmarkCount ?? 0);

    revalidatePath("/");
    revalidatePath("/problems");
    revalidatePath("/bookmarks");
    revalidatePath(`/problems/${problem.slug}`);

    return ok({ count, active });
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Toggle "I have this problem".
 *
 * Correctness rests on the unique `(problemId, userId)` index: we attempt the
 * insert first and let the database reject a second vote. The counter is then
 * moved with an atomic `$inc`, so concurrent voters can never lose an update.
 * The client's optimistic number is discarded — the returned count is the one
 * that was actually persisted.
 */
export async function toggleProblemValidation(
  problemId: string
): Promise<ActionResult<VoteState>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("vote", user.id);
    await connectToDatabase();

    const pid = objectId(problemId);
    const uid = objectId(user.id);

    const problem = await Problem.findOne(
      { _id: pid, moderationStatus: "approved" },
      { authorId: 1, slug: 1, createdAt: 1, solutionCount: 1, commentCount: 1 }
    )
      .lean()
      .exec();
    if (!problem) throw new NotFoundError("That problem is not available.");

    let active: boolean;
    try {
      await ProblemValidation.create({ problemId: pid, userId: uid });
      active = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      await ProblemValidation.deleteOne({ problemId: pid, userId: uid }).exec();
      active = false;
    }

    const delta = active ? 1 : -1;
    const updated = await Problem.findOneAndUpdate(
      { _id: pid },
      { $inc: { validationCount: delta } },
      { returnDocument: "after", projection: { validationCount: 1, solutionCount: 1, commentCount: 1, createdAt: 1, slug: 1 } }
    )
      .lean()
      .exec();

    const count = Math.max(0, updated?.validationCount ?? 0);

    // Trending is derived from counters, so it is refreshed in the same write
    // path rather than by a periodic job.
    await Problem.updateOne(
      { _id: pid },
      {
        $set: {
          hotScore: computeHotScore(
            problemSignal({
              validationCount: count,
              solutionCount: updated?.solutionCount ?? 0,
              commentCount: updated?.commentCount ?? 0,
            }),
            updated?.createdAt ?? new Date()
          ),
        },
      }
    ).exec();

    await awardReputation(
      String(problem.authorId),
      active ? REPUTATION.PROBLEM_VALIDATED : -REPUTATION.PROBLEM_VALIDATED,
      { key: "validationsReceived", delta }
    );

    if (active) {
      await notify({
        userId: String(problem.authorId),
        actorId: user.id,
        type: "problem_validated",
        problemId,
      });
      await maybeRewardValidatedProblem({
        authorId: String(problem.authorId),
        validationCount: count,
      });
      await notifyProblemMilestone({
        problemId,
        authorId: String(problem.authorId),
        validationCount: count,
      });
    }

    revalidatePath(`/problems/${problem.slug}`);

    return ok({ count, active });
  } catch (error) {
    return toActionError(error);
  }
}

/** Toggle "Helpful" on a solution. Same one-vote-per-user guarantee. */
export async function toggleSolutionHelpful(
  solutionId: string
): Promise<ActionResult<VoteState>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("vote", user.id);
    await connectToDatabase();

    const sid = objectId(solutionId);
    const uid = objectId(user.id);

    const solution = await Solution.findOne(
      { _id: sid, moderationStatus: "approved" },
      { authorId: 1, problemId: 1, createdAt: 1 }
    )
      .lean()
      .exec();
    if (!solution) throw new NotFoundError("That solution is not available.");

    let active: boolean;
    try {
      await SolutionVote.create({ solutionId: sid, userId: uid });
      active = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      await SolutionVote.deleteOne({ solutionId: sid, userId: uid }).exec();
      active = false;
    }

    const delta = active ? 1 : -1;
    const updated = await Solution.findOneAndUpdate(
      { _id: sid },
      { $inc: { helpfulCount: delta } },
      { returnDocument: "after", projection: { helpfulCount: 1, createdAt: 1 } }
    )
      .lean()
      .exec();

    const count = Math.max(0, updated?.helpfulCount ?? 0);

    await Solution.updateOne(
      { _id: sid },
      { $set: { hotScore: computeHotScore(count, updated?.createdAt ?? new Date()) } }
    ).exec();

    await awardReputation(
      String(solution.authorId),
      active ? REPUTATION.SOLUTION_HELPFUL : -REPUTATION.SOLUTION_HELPFUL,
      { key: "helpfulVotes", delta }
    );

    const problem = await Problem.findById(solution.problemId, { slug: 1, authorId: 1 })
      .lean()
      .exec();
    if (active) {
      await Promise.all([
        notify({
          userId: String(solution.authorId),
          actorId: user.id,
          type: "solution_voted",
          problemId: String(solution.problemId),
          solutionId,
        }),
        problem && String(problem.authorId) !== String(solution.authorId)
          ? notify({
              userId: String(problem.authorId),
              actorId: user.id,
              type: "problem_liked",
              problemId: String(solution.problemId),
              solutionId,
            })
          : Promise.resolve(),
      ]);
    }

    if (problem) revalidatePath(`/problems/${problem.slug}`);

    return ok({ count, active });
  } catch (error) {
    return toActionError(error);
  }
}

export interface CommentVoteState {
  score: number;
  direction: VoteDirection | null;
}

/**
 * Up/down vote on a comment — one vote per user, direction switchable.
 * Clicking the arrow you already picked removes the vote; clicking the other
 * one flips it. `helpfulCount` holds the net score (can go negative), same
 * as a real vote tally rather than a floor-zero "helpful" counter.
 */
export async function voteComment(
  commentId: string,
  direction: VoteDirection
): Promise<ActionResult<CommentVoteState>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("vote", user.id);
    await connectToDatabase();

    const cid = objectId(commentId);
    const uid = objectId(user.id);

    const comment = await Comment.findOne(
      { _id: cid, moderationStatus: "approved", status: "visible" },
      { authorId: 1, problemId: 1 }
    )
      .lean()
      .exec();
    if (!comment) throw new NotFoundError("That comment is not available.");

    const existing = await CommentVote.findOne({ commentId: cid, userId: uid })
      .lean()
      .exec();

    let delta: number;
    let resultDirection: VoteDirection | null;
    const wasUpvote = existing?.direction === "up";

    if (!existing) {
      await CommentVote.create({ commentId: cid, userId: uid, direction });
      delta = direction === "up" ? 1 : -1;
      resultDirection = direction;
    } else if (existing.direction === direction) {
      await CommentVote.deleteOne({ _id: existing._id }).exec();
      delta = direction === "up" ? -1 : 1;
      resultDirection = null;
    } else {
      await CommentVote.updateOne({ _id: existing._id }, { $set: { direction } }).exec();
      delta = direction === "up" ? 2 : -2;
      resultDirection = direction;
    }

    const updated = await Comment.findOneAndUpdate(
      { _id: cid },
      { $inc: { helpfulCount: delta } },
      { returnDocument: "after", projection: { helpfulCount: 1 } }
    )
      .lean()
      .exec();

    const score = updated?.helpfulCount ?? 0;

    await awardReputation(String(comment.authorId), delta * REPUTATION.COMMENT_HELPFUL, {
      key: "helpfulVotes",
      delta,
    });

    if (resultDirection === "up" && !wasUpvote) {
      const problem = await Problem.findById(comment.problemId, { authorId: 1 })
        .lean()
        .exec();
      await Promise.all([
        notify({
          userId: String(comment.authorId),
          actorId: user.id,
          type: "comment_voted",
          problemId: String(comment.problemId),
          commentId,
        }),
        problem && String(problem.authorId) !== String(comment.authorId)
          ? notify({
              userId: String(problem.authorId),
              actorId: user.id,
              type: "problem_liked",
              problemId: String(comment.problemId),
              commentId,
            })
          : Promise.resolve(),
      ]);
    }

    return ok({ score, direction: resultDirection });
  } catch (error) {
    return toActionError(error);
  }
}

export interface CommentAwardState {
  count: number;
  active: boolean;
}

/**
 * A free, single-tier award — no currency, just a one-per-user toggle that
 * gives the recipient a small reputation bump. See CommentAward model.
 */
export async function toggleCommentAward(
  commentId: string
): Promise<ActionResult<CommentAwardState>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("vote", user.id);
    await connectToDatabase();

    const cid = objectId(commentId);
    const uid = objectId(user.id);

    const comment = await Comment.findOne(
      { _id: cid, moderationStatus: "approved", status: "visible" },
      { authorId: 1 }
    )
      .lean()
      .exec();
    if (!comment) throw new NotFoundError("That comment is not available.");

    let active: boolean;
    try {
      await CommentAward.create({ commentId: cid, userId: uid });
      active = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      await CommentAward.deleteOne({ commentId: cid, userId: uid }).exec();
      active = false;
    }

    const delta = active ? 1 : -1;
    const updated = await Comment.findOneAndUpdate(
      { _id: cid },
      { $inc: { awardCount: delta } },
      { returnDocument: "after", projection: { awardCount: 1 } }
    )
      .lean()
      .exec();

    const count = Math.max(0, updated?.awardCount ?? 0);

    await awardReputation(
      String(comment.authorId),
      active ? REPUTATION.COMMENT_AWARDED : -REPUTATION.COMMENT_AWARDED
    );

    return ok({ count, active });
  } catch (error) {
    return toActionError(error);
  }
}
