import "server-only";

import { Comment, CommentVote, Problem } from "@/models";
import { connectToDatabase } from "@/lib/db/mongoose";
import { toObjectId } from "@/lib/utils/sanitize-query";
import type { VoteDirection } from "@/models";

export type CommentVoteHistoryItem = {
  id: string;
  content: string;
  createdAt: string;
  problem: { slug: string; title: string } | null;
};

/** Private, newest-first history of the comments a user has voted on. */
export async function listCommentVotesByUser(
  userId: string,
  direction: VoteDirection,
): Promise<CommentVoteHistoryItem[]> {
  await connectToDatabase();
  const voterId = toObjectId(userId);
  if (!voterId) return [];

  const votes = await CommentVote.find({ userId: voterId, direction }, { commentId: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();
  if (votes.length === 0) return [];

  const comments = await Comment.find(
    {
      _id: { $in: votes.map((vote) => vote.commentId) },
      status: "visible",
      moderationStatus: "approved",
    },
    { content: 1, problemId: 1 },
  )
    .lean()
    .exec();
  const commentById = new Map(comments.map((comment) => [String(comment._id), comment]));
  const problems = await Problem.find(
    { _id: { $in: comments.map((comment) => comment.problemId) } },
    { slug: 1, title: 1 },
  )
    .lean()
    .exec();
  const problemById = new Map(problems.map((problem) => [String(problem._id), problem]));

  return votes.flatMap((vote) => {
    const comment = commentById.get(String(vote.commentId));
    if (!comment) return [];
    const problem = problemById.get(String(comment.problemId));
    return [{
      id: String(comment._id),
      content: comment.content,
      createdAt: vote.createdAt.toISOString(),
      problem: problem ? { slug: problem.slug, title: problem.title } : null,
    }];
  });
}
