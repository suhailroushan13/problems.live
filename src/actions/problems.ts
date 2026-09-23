"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Category,
  Comment,
  Problem,
  ProblemBookmark,
  ProblemValidation,
  Solution,
  User,
  computeHotScore,
  problemSignal,
} from "@/models";
import { requireUser, getCurrentUser } from "@/lib/auth/current-user";
import {
  createProblemSchema,
  problemStatusSchema,
  updateProblemSchema,
} from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { moderateContent, moderationMessage } from "@/lib/moderation";
import { findSimilarProblems } from "@/lib/similarity";
import { nextAvailableSlug, slugify } from "@/lib/utils/slug";
import { normalizeWhitespace, stripUnsafe } from "@/lib/utils/text";
import { objectId } from "@/lib/utils/sanitize-query";
import {
  awardReputation,
  consumeProblemCredit,
  refundProblemCredit,
} from "@/lib/services/reputation";
import { notify } from "@/lib/services/notify";
import { submitToIndexNow } from "@/lib/services/indexnow";
import { env } from "@/lib/env";
import {
  DomainError,
  NotFoundError,
  fail,
  ok,
  okVoid,
  toActionError,
} from "@/lib/action-helpers";
import { REPUTATION } from "@/lib/constants";
import type { ActionResult } from "@/types";
import type { SimilarProblem } from "@/lib/similarity";

/** Reserve a unique slug, retrying on the (rare) concurrent-insert collision. */
async function reserveSlug(title: string): Promise<string> {
  const base = slugify(title) || "problem";
  const existing = await Problem.find(
    { slug: new RegExp(`^${base}(-\\d+)?$`) },
    { slug: 1 }
  )
    .lean()
    .exec();
  return nextAvailableSlug(base, new Set(existing.map((d) => d.slug)));
}

export async function checkForDuplicates(input: {
  title: string;
  description?: string;
}): Promise<ActionResult<SimilarProblem[]>> {
  try {
    const similar = await findSimilarProblems({
      title: String(input.title ?? "").slice(0, 200),
      description: String(input.description ?? "").slice(0, 2000),
      limit: 4,
    });
    return ok(similar);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProblem(
  raw: unknown
): Promise<ActionResult<{ slug: string; held: boolean }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("problem:create", user.id);

    const input = createProblemSchema.parse(raw);
    await connectToDatabase();

    const category = await Category.findOne({
      _id: objectId(input.categoryId),
      status: "approved",
    })
      .lean()
      .exec();
    if (!category) throw new NotFoundError("Pick a category that exists.");

    const title = normalizeWhitespace(stripUnsafe(input.title));
    const description = normalizeWhitespace(stripUnsafe(input.description));

    const decision = await moderateContent({
      kind: "problem",
      title,
      body: description,
      authorReputation: user.reputation,
    });

    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    // Credits are spent on the attempt, not the outcome — that is what makes
    // them a spam cost. They are refunded if a moderator removes the post or
    // earned back when the problem proves itself (see reputation service).
    const spent = await consumeProblemCredit(user.id);
    if (!spent) {
      return fail(
        "You're out of Credits. Credits are the posting currency and come back as your problems get validated by other people.",
        "no_credits"
      );
    }

    try {
      const slug = await reserveSlug(title);
      const createdAt = new Date();

      const problem = await Problem.create({
        authorId: objectId(user.id),
        title,
        slug,
        description,
        categoryId: category._id,
        location: {
          scope: input.location.scope,
          country: input.location.country || undefined,
          region: input.location.region || undefined,
          city: input.location.city || undefined,
        },
        images: input.images,
        isAnonymous: input.isAnonymous,
        priority: input.priority,
        status: "open",
        moderationStatus: decision.moderationStatus,
        moderation: {
          provider: decision.provider,
          score: decision.score,
          labels: decision.labels,
          reason: decision.reason,
        },
        hotScore: computeHotScore(0, createdAt),
        createdAt,
      });

      if (decision.moderationStatus === "approved") {
        await Promise.all([
          Category.updateOne(
            { _id: category._id },
            { $inc: { problemCount: 1 } }
          ).exec(),
          awardReputation(user.id, 0, { key: "problems", delta: 1 }),
        ]);
        void submitToIndexNow([`${env.appUrl}/problems/${problem.slug}`]);
      }

      revalidatePath("/");
      revalidatePath("/problems");
      revalidatePath(`/categories/${category.slug}`);

      return ok(
        { slug: problem.slug, held: decision.held },
        decision.held ? moderationMessage(decision) : "Your problem is live."
      );
    } catch (error) {
      // Never charge a credit for a write that did not happen.
      await refundProblemCredit(user.id);
      throw error;
    }
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProblem(
  raw: unknown
): Promise<ActionResult<{ slug: string; held: boolean }>> {
  try {
    const user = await requireUser();
    const input = updateProblemSchema.parse(raw);
    await connectToDatabase();

    const problem = await Problem.findById(objectId(input.problemId)).exec();
    if (!problem) throw new NotFoundError("That problem no longer exists.");

    const isOwner = String(problem.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError("You can only edit your own problems.", "forbidden");
    }

    const category = await Category.findOne({
      _id: objectId(input.categoryId),
      status: "approved",
    })
      .lean()
      .exec();
    if (!category) throw new NotFoundError("Pick a category that exists.");

    const title = normalizeWhitespace(stripUnsafe(input.title));
    const description = normalizeWhitespace(stripUnsafe(input.description));

    const decision = await moderateContent({
      kind: "problem",
      title,
      body: description,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    const previousCategoryId = String(problem.categoryId);
    const nextCategoryId = String(category._id);

    problem.title = title;
    problem.description = description;
    problem.categoryId = category._id;
    problem.location = {
      scope: input.location.scope,
      country: input.location.country || undefined,
      region: input.location.region || undefined,
      city: input.location.city || undefined,
    };
    problem.isAnonymous = input.isAnonymous;
    problem.priority = input.priority;
    problem.editedAt = new Date();
    // Re-moderate on edit, but an already-public post is not un-published by a
    // borderline score — it is only downgraded when it now needs review.
    if (decision.moderationStatus === "pending") {
      problem.moderationStatus = "pending";
    }
    problem.moderation = {
      provider: decision.provider,
      score: decision.score,
      labels: decision.labels,
      reason: decision.reason,
      reviewedBy: null,
      reviewedAt: null,
    };

    await problem.save();

    if (previousCategoryId !== nextCategoryId) {
      await Promise.all([
        Category.updateOne(
          { _id: objectId(previousCategoryId) },
          { $inc: { problemCount: -1 } }
        ).exec(),
        Category.updateOne(
          { _id: category._id },
          { $inc: { problemCount: 1 } }
        ).exec(),
      ]);
    }

    if (problem.moderationStatus === "approved") {
      void submitToIndexNow([`${env.appUrl}/problems/${problem.slug}`]);
    }

    revalidatePath(`/problems/${problem.slug}`);
    revalidatePath("/problems");

    return ok(
      { slug: problem.slug, held: decision.held },
      decision.held ? moderationMessage(decision) : "Changes saved."
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProblem(
  problemId: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    const problem = await Problem.findById(objectId(problemId)).exec();
    if (!problem) throw new NotFoundError("That problem no longer exists.");

    const isOwner = String(problem.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError("You can only delete your own problems.", "forbidden");
    }

    const slug = problem.slug;
    const wasApproved = problem.moderationStatus === "approved";

    // Cascade by hand: no foreign keys in MongoDB, and orphaned comments and
    // validations would otherwise keep inflating counters and search.
    await Promise.all([
      Problem.deleteOne({ _id: problem._id }).exec(),
      Comment.deleteMany({ problemId: problem._id }).exec(),
      Solution.deleteMany({ problemId: problem._id }).exec(),
      ProblemValidation.deleteMany({ problemId: problem._id }).exec(),
      ProblemBookmark.deleteMany({ problemId: problem._id }).exec(),
    ]);

    if (wasApproved) {
      await Promise.all([
        Category.updateOne(
          { _id: problem.categoryId },
          { $inc: { problemCount: -1 } }
        ).exec(),
        awardReputation(String(problem.authorId), 0, {
          key: "problems",
          delta: -1,
        }),
      ]);
    }

    revalidatePath("/");
    revalidatePath("/problems");
    revalidatePath(`/problems/${slug}`);

    return okVoid("Problem deleted.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProblemStatus(
  raw: unknown
): Promise<ActionResult<{ status: string }>> {
  try {
    const user = await requireUser();
    const input = problemStatusSchema.parse(raw);
    await connectToDatabase();

    const problem = await Problem.findById(objectId(input.problemId)).exec();
    if (!problem) throw new NotFoundError("That problem no longer exists.");

    const isOwner = String(problem.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError(
        "Only the person who posted this problem can change its status.",
        "forbidden"
      );
    }

    const wasSolved = problem.status === "solved";
    problem.status = input.status;

    if (input.status === "solved") {
      problem.solvedAt = problem.solvedAt ?? new Date();
      problem.solvedBy = objectId(user.id);
      if (input.acceptedSolutionId) {
        const solution = await Solution.findOne({
          _id: objectId(input.acceptedSolutionId),
          problemId: problem._id,
        })
          .lean()
          .exec();
        if (!solution) throw new NotFoundError("That solution is not on this problem.");
        problem.acceptedSolutionId = solution._id;

        await awardReputation(String(solution.authorId), REPUTATION.SOLUTION_ACCEPTED);
        await notify({
          userId: String(solution.authorId),
          actorId: user.id,
          type: "problem_solved",
          problemId: String(problem._id),
          solutionId: String(solution._id),
        });
      }
      if (!wasSolved) {
        await awardReputation(String(problem.authorId), REPUTATION.PROBLEM_SOLVED, {
          key: "solvedProblems",
          delta: 1,
        });
      }
    } else {
      problem.solvedAt = null;
      problem.solvedBy = null;
      problem.acceptedSolutionId = null;
      if (wasSolved) {
        await awardReputation(String(problem.authorId), -REPUTATION.PROBLEM_SOLVED, {
          key: "solvedProblems",
          delta: -1,
        });
      }
    }

    await problem.save();

    // Tell everyone who said "I have this problem" that something changed.
    if (input.status === "solved" || input.status === "being_solved") {
      const validators = await ProblemValidation.find(
        { problemId: problem._id },
        { userId: 1 }
      )
        .limit(500)
        .lean()
        .exec();

      await Promise.all(
        validators.map((v) =>
          notify({
            userId: String(v.userId),
            actorId: user.id,
            type:
              input.status === "solved"
                ? "problem_solved"
                : "problem_being_solved",
            problemId: String(problem._id),
          })
        )
      );
    }

    revalidatePath(`/problems/${problem.slug}`);
    revalidatePath("/problems");

    return ok({ status: problem.status }, "Status updated.");
  } catch (error) {
    return toActionError(error);
  }
}

/** Recomputes a problem's trending score from its current counters. */
export async function refreshHotScore(problemId: string): Promise<void> {
  const problem = await Problem.findById(objectId(problemId), {
    validationCount: 1,
    solutionCount: 1,
    commentCount: 1,
    createdAt: 1,
  })
    .lean()
    .exec();
  if (!problem) return;

  await Problem.updateOne(
    { _id: problem._id },
    { $set: { hotScore: computeHotScore(problemSignal(problem), problem.createdAt) } }
  ).exec();
}

/** Records a completed share so the problem author receives their normal
 * in-app and email activity notification. */
export async function recordProblemShare(
  problemId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    const problem = await Problem.findOne(
      { _id: objectId(problemId), moderationStatus: "approved" },
      { authorId: 1 },
    ).lean().exec();
    if (!problem) throw new NotFoundError("That problem is not available.");

    await notify({
      userId: String(problem.authorId),
      actorId: user.id,
      type: "problem_shared",
      problemId,
    });
    return okVoid();
  } catch (error) {
    // Sharing itself has already completed in the browser. A missing session
    // or a notification problem must never turn that into a visible failure.
    return toActionError(error);
  }
}

/** Used by the "Post problem" entry point to bounce anonymous visitors. */
export async function requireSignInRedirect(next: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/google?next=${encodeURIComponent(next)}`);
}

export async function getRemainingCredits(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  await connectToDatabase();
  const doc = await User.findById(objectId(user.id), { problemCredits: 1 })
    .lean()
    .exec();
  return doc?.problemCredits ?? 0;
}
