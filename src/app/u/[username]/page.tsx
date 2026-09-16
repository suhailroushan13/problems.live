import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Camera,
  FileText,
  Lightbulb,
  Pencil,
  ThumbsUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BioText } from "@/components/shared/bio-text";
import { SocialLinksRow } from "@/components/shared/social-icons";
import { EmptyState } from "@/components/shared/empty-state";
import { ProblemList } from "@/components/problems/problem-item";
import { SolutionCard } from "@/components/solutions/solution-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfileByUsername, listAllUsernames } from "@/lib/data/users";
import { listProblemsByAuthor } from "@/lib/data/problems";
import { listValidatedProblemsByUser } from "@/lib/data/problems";
import { listSolutionsByAuthor } from "@/lib/data/solutions";
import { listRecentCommentsByAuthor } from "@/lib/data/comments";
import { listCommentVotesByUser } from "@/lib/data/votes";
import { formatCount } from "@/lib/utils/format";
import { formatMonthYear, timeAgo } from "@/lib/utils/time";
import { excerpt } from "@/lib/utils/text";
import { TRUST_TIERS } from "@/lib/constants";
import { env, APP_NAME } from "@/lib/env";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 120;

export async function generateStaticParams() {
  try {
    const users = await listAllUsernames(200);
    return users.map(({ username }) => ({ username }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return { title: "Profile not found", robots: { index: false } };
  }

  const description =
    profile.bio ??
    `${profile.name} has shared ${formatCount(
      profile.stats.problems
    )} problems and ${formatCount(profile.stats.solutions)} solutions on ${APP_NAME}.`;

  return {
    title: `@${profile.username}`,
    description,
    alternates: { canonical: `/u/${profile.username}` },
    openGraph: {
      type: "profile",
      title: `${profile.name} (@${profile.username})`,
      description,
      url: `${env.appUrl}/u/${profile.username}`,
      images: profile.avatar ? [{ url: profile.avatar }] : undefined,
    },
  };
}

const PUBLIC_TABS = ["problems", "solutions", "activity"] as const;
const PRIVATE_TABS = ["upvoted", "downvoted"] as const;
const TABS = [...PUBLIC_TABS, ...PRIVATE_TABS] as const;
type Tab = (typeof TABS)[number];

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const [{ username }, query] = await Promise.all([params, searchParams]);

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;
  const visibleTabs: readonly Tab[] = isSelf ? TABS : PUBLIC_TABS;
  const tab: Tab = visibleTabs.includes(query.tab as Tab)
    ? (query.tab as Tab)
    : "problems";

  const [problems, solutions, comments, upvotedProblems, downvotedComments] = await Promise.all([
    tab === "problems"
      ? listProblemsByAuthor(profile.id, { pageSize: 20 })
      : Promise.resolve(null),
    tab === "solutions"
      ? listSolutionsByAuthor(profile.id, { pageSize: 20 })
      : Promise.resolve(null),
    tab === "activity"
      ? listRecentCommentsByAuthor(profile.id, 20)
      : Promise.resolve(null),
    isSelf && tab === "upvoted"
      ? listValidatedProblemsByUser(profile.id)
      : Promise.resolve(null),
    isSelf && tab === "downvoted"
      ? listCommentVotesByUser(profile.id, "down")
      : Promise.resolve(null),
  ]);

  const tier = TRUST_TIERS.find((t) => t.key === profile.trust);

  const stats = [
    { label: "Problems", value: profile.stats.problems, icon: FileText },
    { label: "Solutions", value: profile.stats.solutions, icon: Lightbulb },
    { label: "Solved", value: profile.stats.solvedProblems, icon: CheckCircle2 },
    { label: "Helpful votes", value: profile.stats.helpfulVotes, icon: ThumbsUp },
  ];

  return (
    <div className="page py-12 sm:py-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {isSelf ? (
          <Link
            href="/settings"
            aria-label="Change avatar"
            className="group relative shrink-0 rounded-full focus-visible:outline-none"
          >
            <UserAvatar
              name={profile.name}
              username={profile.username}
              avatar={profile.avatar}
              size="xl"
            />
            <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background transition-transform group-hover:scale-110">
              <Camera className="size-3" aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <UserAvatar
            name={profile.name}
            username={profile.username}
            avatar={profile.avatar}
            size="xl"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-[2rem]">
              {profile.name}
            </h1>
            {tier ? (
              <Badge variant="secondary" className="font-semibold">
                {tier.label}
              </Badge>
            ) : null}
            {profile.role !== "user" ? (
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-[0.9375rem] text-muted-foreground">
            @{profile.username}
          </p>

          {profile.bio ? (
            <BioText className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              {profile.bio}
            </BioText>
          ) : null}

          <SocialLinksRow socialLinks={profile.socialLinks} className="mt-4" />

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            <span>
              <span className="num font-medium text-foreground">
                {formatCount(profile.reputation)}
              </span>{" "}
              reputation
            </span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatMonthYear(profile.joinedAt)}</span>
          </div>
        </div>

        {isSelf ? (
          <Button asChild variant="outline" className="tap pill shrink-0 gap-1.5 px-5 font-bold">
            <Link href="/settings/profile">
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit profile
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="items-start gap-2 px-4 py-3.5">
            <stat.icon className="size-4 text-brand" aria-hidden="true" />
            <div>
              <p className="num text-lg font-bold text-foreground">
                {formatCount(stat.value)}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} className="mt-8 mb-2">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {visibleTabs.map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                href={
                  value === "problems"
                    ? `/u/${profile.username}`
                    : `/u/${profile.username}?tab=${value}`
                }
                scroll={false}
                className="capitalize"
              >
                {value}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "problems" ? (
        problems && problems.items.length > 0 ? (
          <ProblemList
            problems={problems.items}
            isAuthenticated={Boolean(viewer)}
          />
        ) : (
          <EmptyState
            title={
              isSelf
                ? "You haven't shared a problem yet."
                : `@${profile.username} hasn't shared a problem yet.`
            }
            description={
              isSelf
                ? "Anything you post anonymously stays off your public profile."
                : undefined
            }
            action={
              isSelf ? { label: "Share a problem", href: "/problems/new" } : undefined
            }
          />
        )
      ) : null}

      {tab === "solutions" ? (
        solutions && solutions.items.length > 0 ? (
          <div className="divide-y divide-hairline">
            {solutions.items.map((solution) => (
              <div key={solution.id}>
                {solution.problemTitle && solution.problemSlug ? (
                  <Link
                    href={`/problems/${solution.problemSlug}`}
                    className="mt-6 block truncate text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    On: {solution.problemTitle}
                  </Link>
                ) : null}
                <SolutionCard
                  solution={solution}
                  isAuthenticated={Boolean(viewer)}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              isSelf
                ? "You haven't suggested a solution yet."
                : `@${profile.username} hasn't suggested a solution yet.`
            }
            action={
              isSelf ? { label: "Find a problem to fix", href: "/problems" } : undefined
            }
          />
        )
      ) : null}

      {tab === "activity" ? (
        comments && comments.length > 0 ? (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {comments.map((comment) => (
              <li key={comment.id} className="py-4">
                {comment.problem ? (
                  <Link
                    href={`/problems/${comment.problem.slug}#comment-${comment.id}`}
                    className="block truncate text-[0.9375rem] font-medium text-foreground transition-colors hover:text-brand"
                  >
                    {comment.problem.title}
                  </Link>
                ) : null}
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {excerpt(comment.content, 200)}
                </p>
                <p className="num mt-2 text-[0.8125rem] text-muted-foreground">
                  {timeAgo(comment.createdAt)} · {formatCount(comment.helpfulCount)}{" "}
                  helpful
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No public activity yet."
            description="Comments on problems show up here."
          />
        )
      ) : null}

      {isSelf && tab === "upvoted" ? (
        upvotedProblems && upvotedProblems.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Problems you marked as having too.
            </p>
            <ProblemList problems={upvotedProblems} isAuthenticated />
          </>
        ) : (
          <EmptyState
            title="No upvotes yet."
            description="Problems you support will appear here."
            action={{ label: "Browse problems", href: "/problems" }}
          />
        )
      ) : null}

      {isSelf && tab === "downvoted" ? (
        downvotedComments && downvotedComments.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Comment downvotes are private and only visible to you.
            </p>
            <ul className="divide-y divide-hairline border-t border-hairline">
              {downvotedComments.map((vote) => (
                <li key={vote.id} className="py-4">
                  {vote.problem ? (
                    <Link
                      href={`/problems/${vote.problem.slug}#comment-${vote.id}`}
                      className="block truncate text-[0.9375rem] font-medium text-foreground transition-colors hover:text-brand"
                    >
                      {vote.problem.title}
                    </Link>
                  ) : null}
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {excerpt(vote.content, 200)}
                  </p>
                  <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    Downvoted {timeAgo(vote.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title="No downvotes yet."
            description="Comments you downvote will appear here."
          />
        )
      ) : null}
    </div>
  );
}
