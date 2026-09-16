import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
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
      <p className="num mt-1 mb-5 text-[0.8125rem] text-muted-foreground">
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
          <CommentList
            comments={comments}
            problemId={problemId}
            solutionId={solutionId}
            user={user}
          />
        </div>
      ) : (
        <div className="mt-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">No comments yet.</p>
          <p className="mt-1">If you have this problem, say what makes it hard for you. That context helps someone solve it.</p>
        </div>
      )}
    </section>
  );
}
