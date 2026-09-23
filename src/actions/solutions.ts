"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Comment,
  Problem,
  Solution,
  SolutionVote,
  computeHotScore,
  problemSignal,
} from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import {
  createSolutionSchema,
  updateSolutionSchema,
} from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { moderateContent, moderationMessage } from "@/lib/moderation";
import { normalizeWhitespace, stripUnsafe } from "@/lib/utils/text";
import { objectId } from "@/lib/utils/sanitize-query";
import { awardReputation } from "@/lib/services/reputation";
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
import type { ActionResult } from "@/types";

async function syncProblemCounters(problemId: unknown): Promise<string | null> {
  const problem = await Problem.findById(problemId, {
    slug: 1,
    validationCount: 1,
    solutionCount: 1,
    commentCount: 1,
    createdAt: 1,
  })
    .lean()
    .exec();
  if (!problem) return null;

  await Problem.updateOne(
    { _id: problem._id },
    { $set: { hotScore: computeHotScore(problemSignal(problem), problem.createdAt) } }
  ).exec();

  return problem.slug;
}

export async function createSolution(
  raw: unknown
): Promise<ActionResult<{ solutionId: string; held: boolean }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("solution:create", user.id);

    const input = createSolutionSchema.parse(raw);
    await connectToDatabase();

    const problem = await Problem.findOne(
      { _id: objectId(input.problemId), moderationStatus: "approved" },
      { authorId: 1, slug: 1 }
    )
      .lean()
      .exec();
    if (!problem) throw new NotFoundError("That problem is not available.");

    const title = normalizeWhitespace(stripUnsafe(input.title));
    const description = normalizeWhitespace(stripUnsafe(input.description));

    const decision = await moderateContent({
      kind: "solution",
      title,
      body: `${description}\n${input.url ?? ""}`,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    const createdAt = new Date();
    const solution = await Solution.create({
      problemId: objectId(input.problemId),
      authorId: objectId(user.id),
      title,
      description,
      url: input.url || undefined,
      images: input.images,
      status: input.status,
      isAnonymous: input.isAnonymous,
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
      await Problem.updateOne(
        { _id: problem._id },
        { $inc: { solutionCount: 1 } }
      ).exec();
      await awardReputation(user.id, 0, { key: "solutions", delta: 1 });
      await notify({
        userId: String(problem.authorId),
        actorId: user.id,
        type: "solution_suggested",
        problemId: String(problem._id),
        solutionId: String(solution._id),
      });
      await syncProblemCounters(problem._id);
      void submitToIndexNow([`${env.appUrl}/problems/${problem.slug}`]);
    }

    revalidatePath(`/problems/${problem.slug}`);
    revalidatePath("/solutions");

    return ok(
      { solutionId: String(solution._id), held: decision.held },
      decision.held ? moderationMessage(decision) : "Solution posted."
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateSolution(
  raw: unknown
): Promise<ActionResult<{ held: boolean }>> {
  try {
    const user = await requireUser();
    const input = updateSolutionSchema.parse(raw);
    await connectToDatabase();

    const solution = await Solution.findById(objectId(input.solutionId)).exec();
    if (!solution) throw new NotFoundError("That solution no longer exists.");

    const isOwner = String(solution.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError("You can only edit your own solutions.", "forbidden");
    }

    const title = normalizeWhitespace(stripUnsafe(input.title));
    const description = normalizeWhitespace(stripUnsafe(input.description));

    const decision = await moderateContent({
      kind: "solution",
      title,
      body: `${description}\n${input.url ?? ""}`,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    solution.title = title;
    solution.description = description;
    solution.url = input.url || undefined;
    solution.status = input.status;
    solution.isAnonymous = input.isAnonymous;
    solution.editedAt = new Date();
    if (decision.moderationStatus === "pending") {
      solution.moderationStatus = "pending";
    }
    solution.moderation = {
      provider: decision.provider,
      score: decision.score,
      labels: decision.labels,
      reason: decision.reason,
      reviewedBy: null,
      reviewedAt: null,
    };

    await solution.save();

    const slug = await syncProblemCounters(solution.problemId);
    if (slug) revalidatePath(`/problems/${slug}`);

    return ok(
      { held: decision.held },
      decision.held ? moderationMessage(decision) : "Solution updated."
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteSolution(
  solutionId: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    const solution = await Solution.findById(objectId(solutionId)).exec();
    if (!solution) throw new NotFoundError("That solution no longer exists.");

    const isOwner = String(solution.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError("You can only delete your own solutions.", "forbidden");
    }

    const wasApproved = solution.moderationStatus === "approved";
    const problemId = solution.problemId;

    await Promise.all([
      Solution.deleteOne({ _id: solution._id }).exec(),
      SolutionVote.deleteMany({ solutionId: solution._id }).exec(),
      Comment.deleteMany({ solutionId: solution._id }).exec(),
    ]);

    if (wasApproved) {
      await Problem.updateOne(
        { _id: problemId },
        { $inc: { solutionCount: -1 } }
      ).exec();
      await awardReputation(String(solution.authorId), 0, {
        key: "solutions",
        delta: -1,
      });
    }

    // Clearing the accepted pointer keeps "solved" from referencing a ghost.
    await Problem.updateOne(
      { _id: problemId, acceptedSolutionId: solution._id },
      { $set: { acceptedSolutionId: null } }
    ).exec();

    const slug = await syncProblemCounters(problemId);
    if (slug) revalidatePath(`/problems/${slug}`);

    return okVoid("Solution deleted.");
  } catch (error) {
    return toActionError(error);
  }
}
