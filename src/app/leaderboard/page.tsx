import type { Metadata } from "next";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import {
  LEADERBOARD_BOARDS,
  getLeaderboard,
  type LeaderboardBoard,
} from "@/lib/data/leaderboard";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Leaderboard",
  description:"The people doing the most useful work on problems.live — the ones whose solutions and comments others actually found helpful.",
  alternates: { canonical: "/leaderboard" },
};

function isBoard(value: unknown): value is LeaderboardBoard {
  return LEADERBOARD_BOARDS.some((b) => b.key === value);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const board: LeaderboardBoard = isBoard(query.board) ? query.board : "helpful";
  const meta = LEADERBOARD_BOARDS.find((b) => b.key === board)!;
  const entries = await getLeaderboard(board, 25);

  return (
    <div className="page max-w-3xl py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Leaderboard
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Ranked by usefulness, not popularity. Nobody gets here by posting a
          lot — only by posting things other people found genuinely helpful.
        </p>
      </header>

      <Tabs value={board} className="mt-10 mb-6 border-t border-rule pt-6">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {LEADERBOARD_BOARDS.map((item) => (
            <TabsTrigger key={item.key} value={item.key} asChild>
              <Link
                href={
                  item.key === "helpful"
                    ? "/leaderboard"
                    : `/leaderboard?board=${item.key}`
                }
                scroll={false}
              >
                {item.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="mb-4 text-[0.8125rem] text-muted-foreground">{meta.description}</p>

      {entries.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Reputation
                </TableHead>
                <TableHead className="text-right">
                  {meta.unit[0]!.toUpperCase() + meta.unit.slice(1)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.user.id}>
                  <TableCell>
                    <span
                      className={cn("num text-sm font-semibold",
                        entry.rank <= 3 ? "text-brand" : "text-muted-foreground/60"
                      )}
                    >
                      {String(entry.rank).padStart(2, "0")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/u/${entry.user.username}`}
                      className="group flex min-w-0 items-center gap-2.5"
                    >
                      <UserAvatar
                        name={entry.user.name}
                        username={entry.user.username}
                        avatar={entry.user.avatar}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand">
                          {entry.user.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{entry.user.username}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="num hidden text-right text-sm text-muted-foreground sm:table-cell">
                    {formatCount(entry.user.reputation)}
                  </TableCell>
                  <TableCell className="num text-right text-sm font-semibold text-foreground">
                    {formatCount(entry.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="Nobody on the board yet."
          description="Post a solution or a comment that people find useful, and you will show up here."
          action={{ label: "Explore problems", href: "/problems" }}
        />
      )}
    </div>
  );
}
