import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BioText } from "@/components/shared/bio-text";
import { SocialLinksRow } from "@/components/shared/social-icons";
import { AdminUserDetailActions } from "@/components/admin/admin-user-detail-actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAdminUserDetail,
  type AdminUser,
  type AdminUserCommentItem,
  type AdminUserProblemItem,
  type AdminUserSolutionItem,
} from "@/lib/data/admin";
import { formatCount } from "@/lib/utils/format";
import { formatDate, formatDateTimeWithSeconds } from "@/lib/utils/time";
import { excerpt } from "@/lib/utils/text";
import {
  ACCOUNT_GENDER_LABELS,
  PROBLEM_STATUS_LABELS,
  SOLUTION_STATUS_LABELS,
  type ModerationStatus,
} from "@/lib/constants";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TABS = ["problems", "solutions", "comments", "bookmarks"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  return { title: detail ? `@${detail.user.username}` : "User not found" };
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const viewer = await getCurrentUser();
  if (!viewer?.isAdmin) redirect("/admin/users");

  const detail = await getAdminUserDetail(id);
  if (!detail) notFound();

  const { user, problems, solutions, comments, bookmarks, engagement } = detail;
  const isSelf = viewer.id === user.id;
  const tab: Tab = TABS.includes(query.tab as Tab)
    ? (query.tab as Tab)
    : "problems";

  const actionUser: AdminUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    reputation: user.reputation,
    problems: user.stats.problems,
    solutions: user.stats.solutions,
    suspendedUntil: user.suspendedUntil,
    createdAt: user.createdAt,
  };

  const profileStats = [
    { label: "Problems", value: user.stats.problems },
    { label: "Solutions", value: user.stats.solutions },
    { label: "Comments", value: user.stats.comments },
    { label: "Solved", value: user.stats.solvedProblems },
    { label: "Helpful votes", value: user.stats.helpfulVotes },
    { label: "Validations received", value: user.stats.validationsReceived },
  ];

  const engagementStats = [
    { label: "Problems upvoted", value: engagement.problemsValidated },
    {
      label: "Solutions marked helpful",
      value: engagement.solutionsMarkedHelpful,
    },
    { label: "Comment upvotes given", value: engagement.commentUpvotesGiven },
    {
      label: "Comment downvotes given",
      value: engagement.commentDownvotesGiven,
    },
    { label: "Awards given", value: engagement.commentAwardsGiven },
    { label: "Reports filed", value: engagement.reportsFiled },
  ];

  const facts: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Joined", value: formatDateTimeWithSeconds(user.createdAt) },
    { label: "Last seen", value: formatDateTimeWithSeconds(user.lastSeenAt) },
    {
      label: "Profile updated",
      value: formatDateTimeWithSeconds(user.updatedAt),
    },
    { label: "Location", value: user.location },
    { label: "Gender", value: ACCOUNT_GENDER_LABELS[user.gender] },
    { label: "Reputation", value: formatCount(user.reputation) },
    { label: "Problem credits", value: formatCount(user.problemCredits) },
    { label: "Invite credits", value: formatCount(user.inviteCredits) },
    {
      label: "Invited by",
      value: user.invitedBy ? (
        <Link
          href={`/admin/users/${user.invitedBy.id}`}
          className="font-medium text-foreground transition-colors hover:text-brand"
        >
          @{user.invitedBy.username}
        </Link>
      ) : (
        "Direct sign-up"
      ),
    },
    {
      label: "Username changed",
      value: user.usernameChangedAt
        ? formatDateTimeWithSeconds(user.usernameChangedAt)
        : "Never",
    },
    {
      label: "Date of birth",
      value: user.dateOfBirth ? formatDate(user.dateOfBirth) : "Not provided",
    },
    { label: "Email verified", value: user.emailVerified ? "Yes" : "No" },
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to users
      </Link>

      <header className="mt-4 flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={user.name}
            username={user.username}
            avatar={user.avatar}
            size="xl"
            className="size-16 text-lg sm:size-20 sm:text-xl"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {user.name}
              </h2>
              <Badge
                variant={user.role === "user" ? "outline" : "secondary"}
                className="capitalize"
              >
                {user.role}
              </Badge>
              {user.status === "suspended" ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : null}
              {isSelf ? <Badge variant="outline">You</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              @{user.username} · {user.email}
            </p>
            {user.status === "suspended" ? (
              <p className="mt-2 text-sm text-destructive">
                Suspended{" "}
                {user.suspendedUntil
                  ? `until ${formatDateTimeWithSeconds(user.suspendedUntil)}`
                  : "indefinitely"}
                {user.suspensionReason ? ` — ${user.suspensionReason}` : ""}
              </p>
            ) : null}
            {user.bio ? (
              <BioText className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {user.bio}
              </BioText>
            ) : null}
            <SocialLinksRow socialLinks={user.socialLinks} className="mt-2" />
          </div>
        </div>

        <AdminUserDetailActions user={actionUser} isSelf={isSelf} />
      </header>

      <section
        aria-label="Account details"
        className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3"
      >
        {facts.map((fact) => (
          <div key={fact.label} className="bg-card px-4 py-3.5">
            <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {fact.label}
            </p>
            <div className="mt-1 text-sm font-medium text-foreground">
              {fact.value}
            </div>
          </div>
        ))}
      </section>

      <section
        aria-label="Content stats"
        className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-hairline sm:grid-cols-3 lg:grid-cols-6"
      >
        {profileStats.map((stat, index) => (
          <div
            key={stat.label}
            className={`min-h-20 border-hairline px-4 py-3.5 ${index > 0 ? "border-l" : ""} ${index >= 2 ? "border-t sm:border-t-0" : ""} ${index >= 3 ? "lg:border-t-0" : ""}`}
          >
            <p className="num text-xl font-bold tracking-[-0.02em] text-foreground">
              {formatCount(stat.value)}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-label="Engagement given"
        className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-hairline sm:grid-cols-3 lg:grid-cols-6"
      >
        {engagementStats.map((stat, index) => (
          <div
            key={stat.label}
            className={`min-h-20 border-hairline px-4 py-3.5 ${index > 0 ? "border-l" : ""} ${index >= 2 ? "border-t sm:border-t-0" : ""} ${index >= 3 ? "lg:border-t-0" : ""}`}
          >
            <p className="num text-xl font-bold tracking-[-0.02em] text-foreground">
              {formatCount(stat.value)}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 no-scrollbar sm:mt-7 sm:mx-0 sm:px-0">
        <Tabs value={tab} className="min-w-max">
          <TabsList className="h-11 rounded-lg bg-sunken p-1">
            {TABS.map((value) => {
              const count =
                value === "problems"
                  ? problems.length
                  : value === "solutions"
                    ? solutions.length
                    : value === "comments"
                      ? comments.length
                      : bookmarks.length;

              return (
                <TabsTrigger key={value} value={value} asChild>
                  <Link
                    href={`/admin/users/${user.id}?tab=${value}`}
                    scroll={false}
                    className="min-h-9 gap-1.5 px-3.5 text-sm capitalize"
                  >
                    {value}
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums"
                    >
                      {formatCount(count)}
                    </Badge>
                  </Link>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <main className="mt-4 sm:mt-5">
        {tab === "problems" ? <ProblemsTab problems={problems} /> : null}
        {tab === "solutions" ? <SolutionsTab solutions={solutions} /> : null}
        {tab === "comments" ? <CommentsTab comments={comments} /> : null}
        {tab === "bookmarks" ? (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {bookmarks.length === 0 ? (
              <EmptyState
                title="No bookmarks."
                description="Problems this user has saved will appear here."
              />
            ) : (
              bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  {bookmark.problemSlug ? (
                    <Link
                      href={`/problems/${bookmark.problemSlug}`}
                      className="truncate text-sm font-medium text-foreground transition-colors hover:text-brand"
                    >
                      {bookmark.problemTitle ?? "Untitled problem"}
                    </Link>
                  ) : (
                    <span className="truncate text-sm text-muted-foreground italic">
                      Problem deleted
                    </span>
                  )}
                  <span className="num shrink-0 text-xs text-muted-foreground">
                    {formatDateTimeWithSeconds(bookmark.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </main>
    </div>
  );
}

function moderationVariant(
  status: ModerationStatus
): "outline" | "secondary" | "destructive" {
  if (status === "approved") return "outline";
  if (status === "pending") return "secondary";
  return "destructive";
}

function ProblemsTab({ problems }: { problems: AdminUserProblemItem[] }) {
  if (problems.length === 0) {
    return (
      <EmptyState
        title="No problems posted."
        description="Problems this user has posted will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {problems.map((problem) => (
        <li key={problem.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/problems/${problem.slug}`}
              className="truncate text-[0.9375rem] font-medium text-foreground transition-colors hover:text-brand"
            >
              {problem.title}
            </Link>
            <span className="num text-xs whitespace-nowrap text-muted-foreground">
              {formatDateTimeWithSeconds(problem.createdAt)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">
              {PROBLEM_STATUS_LABELS[problem.status]}
            </Badge>
            <Badge variant={moderationVariant(problem.moderationStatus)}>
              {problem.moderationStatus}
            </Badge>
            {problem.isAnonymous ? (
              <Badge variant="secondary">Anonymous</Badge>
            ) : null}
            {problem.featured ? (
              <Badge variant="secondary">Featured</Badge>
            ) : null}
            {problem.reportCount > 0 ? (
              <Badge variant="destructive">
                {formatCount(problem.reportCount)} reports
              </Badge>
            ) : null}
          </div>
          <p className="num mt-2 text-[0.8125rem] text-muted-foreground">
            {formatCount(problem.validationCount)} upvotes ·{" "}
            {formatCount(problem.solutionCount)} solutions ·{" "}
            {formatCount(problem.commentCount)} comments ·{" "}
            {formatCount(problem.bookmarkCount)} bookmarks
          </p>
        </li>
      ))}
    </ul>
  );
}

function SolutionsTab({ solutions }: { solutions: AdminUserSolutionItem[] }) {
  if (solutions.length === 0) {
    return (
      <EmptyState
        title="No solutions posted."
        description="Solutions this user has proposed will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {solutions.map((solution) => (
        <li key={solution.id} className="py-4">
          {solution.problemSlug ? (
            <Link
              href={`/problems/${solution.problemSlug}#solution-${solution.id}`}
              className="block truncate text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              On: {solution.problemTitle ?? solution.problemSlug}
            </Link>
          ) : null}
          <p className="mt-1 truncate text-[0.9375rem] font-medium text-foreground">
            {solution.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">
              {SOLUTION_STATUS_LABELS[solution.status]}
            </Badge>
            <Badge variant={moderationVariant(solution.moderationStatus)}>
              {solution.moderationStatus}
            </Badge>
            {solution.isAnonymous ? (
              <Badge variant="secondary">Anonymous</Badge>
            ) : null}
            {solution.reportCount > 0 ? (
              <Badge variant="destructive">
                {formatCount(solution.reportCount)} reports
              </Badge>
            ) : null}
          </div>
          <p className="num mt-2 text-[0.8125rem] text-muted-foreground">
            {formatCount(solution.helpfulCount)} helpful ·{" "}
            {formatCount(solution.commentCount)} comments ·{" "}
            {formatDateTimeWithSeconds(solution.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CommentsTab({ comments }: { comments: AdminUserCommentItem[] }) {
  if (comments.length === 0) {
    return (
      <EmptyState
        title="No comments or replies."
        description="Comments and replies this user has posted will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {comments.map((comment) => (
        <li key={comment.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {comment.problemSlug ? (
              <Link
                href={`/problems/${comment.problemSlug}#comment-${comment.id}`}
                className="truncate text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {comment.problemTitle ?? "On a problem"}
              </Link>
            ) : (
              <span className="text-[0.8125rem] text-muted-foreground italic">
                Problem deleted
              </span>
            )}
            <span className="num text-xs whitespace-nowrap text-muted-foreground">
              {formatDateTimeWithSeconds(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground">
            {excerpt(comment.content, 240)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {comment.isReply ? <Badge variant="secondary">Reply</Badge> : null}
            {comment.status === "deleted" ? (
              <Badge variant="destructive">Deleted</Badge>
            ) : null}
            <Badge variant={moderationVariant(comment.moderationStatus)}>
              {comment.moderationStatus}
            </Badge>
            {comment.isAnonymous ? (
              <Badge variant="secondary">Anonymous</Badge>
            ) : null}
            {comment.reportCount > 0 ? (
              <Badge variant="destructive">
                {formatCount(comment.reportCount)} reports
              </Badge>
            ) : null}
          </div>
          <p className="num mt-2 text-[0.8125rem] text-muted-foreground">
            {formatCount(comment.helpfulCount)} helpful ·{" "}
            {formatCount(comment.replyCount)} replies
          </p>
        </li>
      ))}
    </ul>
  );
}
