import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ProblemList } from "@/components/problems/problem-item";
import { SolutionCard } from "@/components/solutions/solution-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfileByUsername, listAllUsernames } from "@/lib/data/users";
import { listProblemsByAuthor } from "@/lib/data/problems";
import { listSolutionsByAuthor } from "@/lib/data/solutions";
import { listRecentCommentsByAuthor } from "@/lib/data/comments";
import { formatCount } from "@/lib/utils/format";
import { formatMonthYear, timeAgo } from "@/lib/utils/time";
import { excerpt } from "@/lib/utils/text";
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

const TABS = ["problems", "solutions", "activity"] as const;
type Tab = (typeof TABS)[number];

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const [{ username }, query] = await Promise.all([params, searchParams]);

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const tab: Tab = TABS.includes(query.tab as Tab) ? (query.tab as Tab) : "problems";
  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;

  const [problems, solutions, comments] = await Promise.all([
    tab === "problems"
      ? listProblemsByAuthor(profile.id, { pageSize: 20 })
      : Promise.resolve(null),
    tab === "solutions"
      ? listSolutionsByAuthor(profile.id, { pageSize: 20 })
      : Promise.resolve(null),
    tab === "activity"
      ? listRecentCommentsByAuthor(profile.id, 20)
      : Promise.resolve(null),
  ]);

  const stats = [
    { label: "problems", value: profile.stats.problems },
    { label: "solutions", value: profile.stats.solutions },
    { label: "solved", value: profile.stats.solvedProblems },
    { label: "helpful votes", value: profile.stats.helpfulVotes },
  ];

  return (
    <div className="page max-w-3xl py-12 sm:py-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <UserAvatar
          name={profile.name}
          username={profile.username}
          avatar={profile.avatar}
          size="xl"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">
            {profile.name}
          </h1>
          <p className="mt-1 text-[0.9375rem] text-muted-foreground">
            @{profile.username}
          </p>

          {profile.bio ? (
            <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            <span>
              <span className="num font-medium text-foreground">
                {formatCount(profile.reputation)}
              </span>{" "}
              reputation
            </span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatMonthYear(profile.joinedAt)}</span>
            {profile.role !== "user" ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{profile.role}</span>
              </>
            ) : null}
          </div>
        </div>

        {isSelf ? (
          <Link
            href="/settings"
            className="tap pill inline-flex shrink-0 items-center border border-hairline bg-elevated px-5 text-sm font-bold text-foreground transition-colors hover:border-brand-border hover:text-brand"
          >
            Edit profile
          </Link>
        ) : null}
      </header>

      <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-hairline py-5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <dd className="num text-[0.9375rem] font-semibold text-foreground">
              {formatCount(stat.value)}
            </dd>
            <dt className="text-[0.8125rem] text-muted-foreground">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      <Tabs value={tab} className="mt-8 mb-2">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {TABS.map((value) => (
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
    </div>
  );
}
