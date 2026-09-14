import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { formatCount } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CommentDTO } from "@/types";

export function CommentThread({
  comments,
  problemId,
  solutionId,
  user,
  count,
}: {
  comments: CommentDTO[];
  problemId: string;
  solutionId?: string | null;
  user: SessionUser | null;
  count: number;
}) {
  return (
    <section id="discussion" className="scroll-mt-24">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">
        Discussion
      </h2>
      <p className="num mt-1 mb-6 text-[0.8125rem] text-muted-foreground">
        {formatCount(count)} {count === 1 ? "comment" : "comments"}
      </p>

      <CommentForm
        problemId={problemId}
        solutionId={solutionId}
        user={user}
        placeholder="Write a comment…"
        className="mb-2"
      />

      {comments.length > 0 ? (
        <div className="mt-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              problemId={problemId}
              solutionId={solutionId}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-[0.9375rem] leading-relaxed text-muted-foreground">
          No comments yet. If you have this problem, say what makes it hard for
          you — that context is what helps someone solve it.
        </p>
      )}
    </section>
  );
}
