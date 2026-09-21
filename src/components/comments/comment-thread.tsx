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
      <h2 className="text-h3 text-foreground">
        Discussion
      </h2>
      <p className="mt-1 text-[0.9375rem] text-muted-foreground">Talk about the problem and add context.</p>
      <p className="num mt-2 mb-5 text-[0.8125rem] font-semibold text-muted-foreground">
        {formatCount(count)} {count === 1 ? "comment" : "comments"}
      </p>

      <CommentForm
        problemId={problemId}
        solutionId={solutionId}
        user={user}
        placeholder="Write a comment…"
        className="mb-2 rounded-xl border border-hairline bg-tint p-4 sm:p-5"
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
          <p className="font-medium text-foreground">No discussion yet.</p>
          <p className="mt-1">If you have this problem, share what makes it difficult for you. Your context can help someone understand and solve it.</p>
        </div>
      )}
    </section>
  );
}
