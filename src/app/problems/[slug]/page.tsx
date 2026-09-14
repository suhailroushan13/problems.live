import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthorLine } from "@/components/shared/author-line";
import { SafeText } from "@/components/shared/safe-text";
import { PostImages } from "@/components/shared/post-images";
import { ProblemMini } from "@/components/problems/problem-item";
import { StatusDot } from "@/components/problems/status-dot";
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
import { excerpt } from "@/lib/utils/text";
import { formatDate } from "@/lib/utils/time";
import { env, APP_NAME } from "@/lib/env";
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

  const description = excerpt(problem.description, 155);
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

  const [problem, user] = await Promise.all([
    getProblemBySlug(slug),
    getCurrentUser(),
  ]);

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

      <article className="mx-auto max-w-[46rem] px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href="/problems"
                  className="inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="size-3" />
                  Problems
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {problem.category ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/categories/${problem.category.slug}`}>
                      {problem.category.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-40 truncate sm:max-w-xs">
                {problem.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {problem.moderationStatus !== "approved" ? (
          <Alert className="mb-6 border-brand-border bg-brand-muted/40">
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

        <header>
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            {problem.category ? (
              <Link
                href={`/categories/${problem.category.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {problem.category.name}
              </Link>
            ) : null}
            {problem.location.scope !== "global" ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{problem.location.label}</span>
              </>
            ) : null}
            {problem.status !== "open" ? (
              <>
                <span aria-hidden="true">·</span>
                <StatusDot status={problem.status} />
              </>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[1.875rem] leading-[1.15] font-extrabold tracking-[-0.032em] text-balance text-foreground sm:text-[2.375rem]">
              {problem.title}
            </h1>

            <div className="shrink-0 pt-1">
              <ProblemActions
                problemId={problem.id}
                slug={problem.slug}
                status={problem.status}
                isOwn={problem.isOwn}
                isModerator={Boolean(user?.isModerator)}
                isAuthenticated={Boolean(user)}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AuthorLine
              author={problem.author}
              createdAt={problem.createdAt}
              editedAt={problem.editedAt}
            />
          </div>
        </header>

        <SafeText className="mt-7 text-base leading-[1.75]">{problem.description}</SafeText>

        {problem.images.length > 0 ? (
          <PostImages images={problem.images} className="mt-6" />
        ) : null}

        {problem.status === "solved" && problem.solvedAt ? (
          <p className="mt-7 flex items-start gap-2.5 text-[0.9375rem] text-status-solved">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Solved on {formatDate(problem.solvedAt)}.{" "}
              <span className="text-muted-foreground">
                {problem.acceptedSolutionId
                  ? "One of the solutions below was accepted."
                  : "The person who posted this says it is no longer a problem."}
              </span>
            </span>
          </p>
        ) : null}

        <ValidationPanel
          problemId={problem.id}
          initialCount={problem.validationCount}
          initialActive={problem.hasValidated}
          isAuthenticated={Boolean(user)}
        />

        <div className="mt-12">
          <SolutionsSection
            problemId={problem.id}
            problemTitle={problem.title}
            solutions={solutions}
            solutionComments={solutionComments}
            user={user}
            canAccept={problem.isOwn || Boolean(user?.isModerator)}
          />
        </div>

        <div className="mt-14 border-t border-hairline pt-10">
          <CommentThread
            comments={comments}
            problemId={problem.id}
            user={user}
            count={problem.commentCount}
          />
        </div>

        {relatedProblems.length > 0 ? (
          <div className="mt-14 border-t border-hairline pt-10">
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
      </article>
    </>
  );
}
