import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategoryIcon } from "@/components/shared/category-icon";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { PostImages } from "@/components/shared/post-images";
import { ProblemMini } from "@/components/problems/problem-item";
import { PriorityBadge } from "@/components/problems/priority-badge";
import { ValidationPanel } from "@/components/problems/validate-button";
import { ProblemActions } from "@/components/problems/problem-actions";
import { SolutionsSection } from "@/components/solutions/solutions-section";
import { CommentThread } from "@/components/comments/comment-thread";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProblemBySlug, listProblems } from "@/lib/data/problems";
import { listSolutionsForProblem } from "@/lib/data/solutions";
import {
  listCommentsForProblem,
  listSolutionCommentsGrouped,
} from "@/lib/data/comments";
import { findSimilarProblems } from "@/lib/similarity";
import { excerpt, stripMarkdown } from "@/lib/utils/text";
import { formatDate, timeAgoLong } from "@/lib/utils/time";
import { env, APP_NAME } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);

  if (!problem) {
    return { title: "Problem not found", robots: { index: false } };
  }

  const description = excerpt(stripMarkdown(problem.description), 155);
  const url = `${env.appUrl}/problems/${problem.slug}`;
  const byline = problem.author ? `@${problem.author.username}` : "Anonymous";

  return {
    title: problem.title,
    description,
    alternates: { canonical: `/problems/${problem.slug}` },
    openGraph: {
      type: "article",
      title: problem.title,
      description,
      url,
      siteName: APP_NAME,
      publishedTime: problem.createdAt,
      authors: [byline],
      images: problem.images[0]?.url ? [{ url: problem.images[0].url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: problem.title,
      description,
    },
    // Held or removed problems must never enter the index.
    robots:
      problem.moderationStatus === "approved"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

function structuredData(problem: ProblemDTO) {
  return {"@context": "https://schema.org","@type": "DiscussionForumPosting",
    headline: problem.title,
    articleBody: problem.description,
    datePublished: problem.createdAt,
    url: `${env.appUrl}/problems/${problem.slug}`,
    author: problem.author
      ? {"@type": "Person",
          name: problem.author.name,
          url: `${env.appUrl}/u/${problem.author.username}`,
        }
      : { "@type": "Person", name: "Anonymous" },
    interactionStatistic: [
      {"@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: problem.validationCount,
      },
      {"@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: problem.commentCount,
      },
    ],
  };
}

export default async function ProblemPage({ params }: PageProps) {
  const { slug } = await params;

  const user = await getCurrentUser();

  if (!user) redirect(`/login?next=/problems/${slug}`);

  const problem = await getProblemBySlug(slug);

  if (!problem) notFound();

  const [solutions, comments, solutionComments, related] = await Promise.all([
    listSolutionsForProblem(problem.id, {
      acceptedSolutionId: problem.acceptedSolutionId,
    }),
    listCommentsForProblem(problem.id),
    listSolutionCommentsGrouped(problem.id),
    findSimilarProblems({
      title: problem.title,
      description: problem.description,
      limit: 3,
      excludeId: problem.id,
    }),
  ]);

  const relatedProblems =
    related.length > 0
      ? (
          await listProblems({
            sort: "validated",
            category: problem.category?.slug,
            pageSize: 4,
          })
        ).items.filter((item) => item.id !== problem.id).slice(0, 3)
      : [];

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from server-controlled fields only; `<` is escaped so the
        // payload can never terminate the script element early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(problem)).replace(/</g, "\\u003c"),
        }}
      />

      <article className="page-wide py-4 pb-16 sm:py-7 lg:py-8">
        <div className="mx-auto max-w-[68.75rem]">
        <Link
          href="/problems"
          className="tap inline-flex h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to problems
        </Link>

        {problem.moderationStatus !== "approved" ? (
          <Alert
            className={cn(
              "mb-6",
              problem.moderationStatus === "pending"
                ? "border-brand-border bg-brand-muted/40"
                : "border-hairline bg-sunken"
            )}
          >
            <AlertTitle>
              {problem.moderationStatus === "pending"
                ? "Awaiting review"
                : "Removed by a moderator"}
            </AlertTitle>
            <AlertDescription>
              {problem.moderationStatus === "pending"
                ? "Only you and our moderators can see this while it is being reviewed."
                : "This problem is no longer public. If you think that is a mistake, reply to the notification you received."}
            </AlertDescription>
          </Alert>
        ) : null}

        <header className="mt-3 max-w-[52rem] sm:mt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
              {problem.author ? (
                <UserAvatar
                  name={problem.author.name}
                  username={problem.author.username}
                  avatar={problem.author.avatar}
                  size="md"
                />
              ) : (
                <AnonymousAvatar size="md" />
              )}
              <div className="min-w-0">
                {problem.author ? (
                  <Link href={`/u/${problem.author.username}`} className="block font-medium text-foreground transition-colors hover:text-brand">
                    {problem.author.name}
                  </Link>
                ) : (
                  <span className="block font-medium text-foreground">Anonymous</span>
                )}
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  {problem.category ? (
                    <Link
                      href={`/categories/${problem.category.slug}`}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <CategoryIcon name={problem.category.icon} className="size-3" />
                      {problem.category.name}
                    </Link>
                  ) : null}
                  {problem.category ? <span aria-hidden="true">·</span> : null}
                  <time dateTime={problem.createdAt}>{timeAgoLong(problem.createdAt)}</time>
                  {problem.location.scope !== "global" ? (
                    <><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{problem.location.label}</span></>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="-mr-2 -mt-1 shrink-0"><ProblemActions problemId={problem.id} slug={problem.slug} status={problem.status} isOwn={problem.isOwn} isModerator={Boolean(user?.isModerator)} isAuthenticated={Boolean(user)} variant="header" /></div>
          </div>

          <h1 className="text-balance mt-6 text-[2rem] leading-[1.12] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem] sm:leading-[1.08]">
            {problem.title}
          </h1>
        </header>

        <section aria-labelledby="problem-details" className="mt-5 max-w-[52rem] sm:mt-6">
          <p id="problem-details" className="sr-only">Problem details</p>
          <MarkdownContent className="text-base leading-7 text-foreground/80 sm:text-[1.125rem] sm:leading-8">
                {problem.description}
              </MarkdownContent>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {problem.category ? (
              <Link href={`/categories/${problem.category.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-border hover:text-foreground"><CategoryIcon name={problem.category.icon} className="size-3 text-brand" />{problem.category.name}<span aria-hidden="true">·</span>#{problem.category.slug}</Link>
            ) : null}
            <PriorityBadge priority={problem.priority} showNormal className="h-7 px-2.5 text-xs" />
          </div>
          {problem.images.length > 0 ? <PostImages images={problem.images} className="mt-6" /> : null}
          {problem.status === "solved" && problem.solvedAt ? (
                <div className="mt-7 flex items-start gap-3 rounded-lg border border-status-solved/20 bg-status-solved/8 px-4 py-3.5">
                  <CheckCircle2
                    className="mt-0.5 size-[1.125rem] shrink-0 text-status-solved"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-status-solved">
                      Solved on {formatDate(problem.solvedAt)}.
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {problem.acceptedSolutionId
                        ? "One of the solutions below was accepted."
                        : "The person who posted this says it is no longer a problem."}
                    </span>
                  </p>
                </div>
          ) : null}
        </section>

        <div className="max-w-[52rem]"><ValidationPanel problemId={problem.id} initialCount={problem.validationCount} initialActive={problem.hasValidated} isAuthenticated={Boolean(user)} commentCount={problem.commentCount} bookmarkCount={problem.bookmarkCount} hasBookmarked={problem.hasBookmarked} /></div>

        <div className="mt-9 max-w-[52rem] border-t border-hairline pt-8 sm:mt-11 sm:pt-10">
              <SolutionsSection
                problemId={problem.id}
                problemTitle={problem.title}
                solutions={solutions}
                solutionComments={solutionComments}
                user={user}
                canAccept={problem.isOwn || Boolean(user?.isModerator)}
              />
        </div>

        <div className="mt-9 max-w-[52rem] border-t border-hairline pt-8 sm:mt-11 sm:pt-10">
              <CommentThread
                comments={comments}
                problemId={problem.id}
                user={user}
                count={problem.commentCount}
              />
        </div>

        {relatedProblems.length > 0 ? (
              <div className="mt-9 max-w-[52rem] border-t border-hairline pt-8 sm:mt-11 sm:pt-10">
                <h2 className="label mb-5 text-muted-foreground">
                  Related problems
                </h2>
                <ul className="space-y-1">
                  {relatedProblems.map((item) => (
                    <ProblemMini key={item.id} problem={item} />
                  ))}
                </ul>
              </div>
        ) : null}
        </div>
      </article>
    </>
  );
}
