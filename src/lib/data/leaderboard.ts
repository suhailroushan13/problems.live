import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, type IUser } from "@/models";
import type { LeaderboardEntry } from "@/types";

export type LeaderboardBoard = "helpful" | "solvers" | "solved";

export const LEADERBOARD_BOARDS: Array<{
  key: LeaderboardBoard;
  label: string;
  description: string;
  unit: string;
}> = [
  {
    key: "helpful",
    label: "Most helpful",
    description: "People whose solutions and comments others found useful.",
    unit: "helpful votes",
  },
  {
    key: "solvers",
    label: "Top problem solvers",
    description: "People who post the solutions the community rates highest.",
    unit: "solutions",
  },
  {
    key: "solved",
    label: "Most problems solved",
    description: "People whose problems reached a real resolution.",
    unit: "solved",
  },
];

const SORT_BY_BOARD: Record<LeaderboardBoard, Record<string, 1 | -1>> = {
  helpful: { "stats.helpfulVotes": -1, reputation: -1 },
  solvers: { "stats.solutions": -1, "stats.helpfulVotes": -1 },
  solved: { "stats.solvedProblems": -1, reputation: -1 },
};

function valueFor(board: LeaderboardBoard, doc: IUser): number {
  switch (board) {
    case "helpful":
      return doc.stats?.helpfulVotes ?? 0;
    case "solvers":
      return doc.stats?.solutions ?? 0;
    case "solved":
      return doc.stats?.solvedProblems ?? 0;
  }
}

export async function getLeaderboard(
  board: LeaderboardBoard,
  limit = 25
): Promise<LeaderboardEntry[]> {
  await connectToDatabase();

  const docs = await User.find({ status: "active" })
    .sort(SORT_BY_BOARD[board])
    .limit(limit)
    .lean<IUser[]>()
    .exec();

  return docs
    .map((doc) => ({
      rank: 0,
      user: {
        id: String(doc._id),
        name: doc.name,
        username: doc.username,
        avatar: doc.avatar,
        reputation: doc.reputation ?? 0,
      },
      value: valueFor(board, doc),
    }))
    // Someone with a zero score has not earned a leaderboard slot.
    .filter((entry) => entry.value > 0)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
