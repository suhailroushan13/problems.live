import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  FileText,
  MoreHorizontal,
  Pencil,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { ProfileDTO } from "@/types";

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
    { label: "Problems", value: profile.stats.problems },
    { label: "Solutions", value: profile.stats.solutions },
    { label: "Solved", value: profile.stats.solvedProblems },
    { label: "Helpful votes", value: profile.stats.helpfulVotes },
  ];

  return (
    <div className="mx-auto w-full max-w-[68.75rem] px-4 py-6 sm:px-10 sm:py-8">
      <div className="flex min-h-11 items-center justify-between">
        <Link href="/problems" className="tap inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>
      </div>

      <header className="relative mt-1 border-b border-hairline pb-6 sm:mt-3 sm:flex sm:items-start sm:gap-6 sm:pb-8">
        {isSelf ? (
          <Link href="/settings" aria-label="Profile settings" className="tap absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground sm:hidden">
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Link>
        ) : null}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          {isSelf ? (
            <Link href="/settings" aria-label="Change avatar" className="group relative shrink-0 rounded-full focus-visible:outline-none">
              <UserAvatar name={profile.name} username={profile.username} avatar={profile.avatar} size="xl" className="size-20 text-xl sm:size-24 sm:text-2xl" />
              <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background transition-transform group-hover:scale-110">
                <Camera className="size-3.5" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <UserAvatar name={profile.name} username={profile.username} avatar={profile.avatar} size="xl" className="size-20 text-xl sm:size-24 sm:text-2xl" />
          )}

          <div className="mt-3 min-w-0 sm:hidden">
            <ProfileIdentity profile={profile} tier={tier?.label} />
          </div>
        </div>

        <div className="mt-5 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
          <div className="hidden sm:block"><ProfileIdentity profile={profile} tier={tier?.label} /></div>
          {profile.bio ? (
            <BioText className="mt-3 text-[0.9375rem] leading-6 text-muted-foreground">
              {profile.bio}
            </BioText>
          ) : null}
          <SocialLinksRow socialLinks={profile.socialLinks} className="mt-3 justify-center sm:justify-start" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground sm:justify-start">
            <span><span className="num font-semibold text-foreground">{formatCount(profile.reputation)}</span> reputation</span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatMonthYear(profile.joinedAt)}</span>
          </div>
        </div>

        {isSelf ? (
          <Button asChild variant="outline" className="mt-5 h-11 w-full shrink-0 gap-1.5 px-5 font-semibold sm:mt-0 sm:w-auto">
            <Link href="/settings/profile"><Pencil className="size-3.5" aria-hidden="true" />Edit profile</Link>
          </Button>
        ) : null}
      </header>

      <section aria-label="Profile statistics" className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-hairline sm:mt-6 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`min-h-20 px-4 py-3.5 ${index % 2 === 1 ? "border-l border-hairline" : ""} ${index > 1 ? "border-t border-hairline sm:border-t-0" : ""} ${index > 0 ? "sm:border-l sm:border-hairline" : ""}`}>
            <p className="num text-xl font-bold tracking-[-0.02em] text-foreground">{formatCount(stat.value)}</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 no-scrollbar sm:mt-7 sm:mx-0 sm:px-0">
      <Tabs value={tab} className="min-w-max">
        <TabsList className="h-11 rounded-lg bg-sunken p-1">
          {visibleTabs.map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                href={
                  value === "problems"
                    ? `/u/${profile.username}`
                    : `/u/${profile.username}?tab=${value}`
                }
                scroll={false}
                className="min-h-9 px-3.5 text-sm capitalize"
              >
                {value === "problems" ? `Problems ${profile.stats.problems}` : value === "solutions" ? `Solutions ${profile.stats.solutions}` : value}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      </div>

      <main className="mt-4 sm:mt-5">

      {tab === "problems" ? (
        problems && problems.items.length > 0 ? (
          <ProblemList
            problems={problems.items}
            isAuthenticated={Boolean(viewer)}
          />
        ) : (
          <ProfileProblemsEmpty isSelf={isSelf} username={profile.username} />
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
      </main>
    </div>
  );
}

function ProfileIdentity({
  profile,
  tier,
}: {
  profile: ProfileDTO;
  tier?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <h1 className="break-words text-[1.5rem] font-bold tracking-[-0.035em] text-foreground sm:text-[1.75rem]">
          {profile.name}
        </h1>
        {profile.role !== "user" ? (
          <Badge variant="outline" className="h-6 border-hairline px-2 text-[0.6875rem] font-semibold capitalize text-muted-foreground">
            {profile.role}
          </Badge>
        ) : null}
        {tier === "New" ? (
          <Badge variant="secondary" className="h-6 px-2 text-[0.6875rem] font-medium text-muted-foreground">
            New
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
    </>
  );
}

function ProfileProblemsEmpty({
  isSelf,
  username,
}: {
  isSelf: boolean;
  username: string;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-tint px-5 py-9 text-center sm:py-10">
      <span className="mx-auto flex size-9 items-center justify-center rounded-lg border border-hairline bg-elevated text-brand" aria-hidden="true">
        <FileText className="size-4" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-foreground">No problems yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {isSelf
          ? "You haven't shared a problem yet. Have something you've been struggling with? Someone here might have the answer."
          : `@${username} hasn't shared a problem yet.`}
      </p>
      {isSelf ? (
        <Button asChild className="mt-5 h-11 px-4">
          <Link href="/problems/new">+ Post a problem</Link>
        </Button>
      ) : null}
    </section>
  );
}
