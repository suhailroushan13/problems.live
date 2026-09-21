import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Category,
  Comment,
  Problem,
  ProblemValidation,
  Report,
  Solution,
  SiteVisit,
  User,
  WaitlistSignup,
} from "@/models";

export interface PlatformStats {
  problems: number;
  validations: number;
  solutions: number;
  solved: number;
}

export interface LiveVisitorStats {
  totalVisits: number;
  livePeople: number;
}

const LIVE_VISITOR_WINDOW_MS = 75_000;

/**
 * A read-only snapshot for the header's first render. Presence is refreshed
 * by the browser after hydration, but this prevents the visitor counts from
 * briefly rendering as zero while that request is in flight.
 */
export async function getLiveVisitorStats(): Promise<LiveVisitorStats | null> {
  try {
    await connectToDatabase();
    const now = new Date();
    const [totalVisits, livePeople] = await Promise.all([
      SiteVisit.countDocuments({}).exec(),
      SiteVisit.countDocuments({
        lastSeenAt: { $gte: new Date(now.getTime() - LIVE_VISITOR_WINDOW_MS) },
      }).exec(),
    ]);

    return { totalVisits, livePeople };
  } catch (error) {
    // The header must remain usable if visitor telemetry is temporarily down.
    console.error("[live-stats] failed to read initial visitor statistics", error);
    return null;
  }
}

export async function getPlatformStats(): Promise<PlatformStats> {
  await connectToDatabase();

  const [problems, validations, solutions, solved] = await Promise.all([
    Problem.countDocuments({ moderationStatus: "approved" }).exec(),
    ProblemValidation.estimatedDocumentCount().exec(),
    Solution.countDocuments({ moderationStatus: "approved" }).exec(),
    Problem.countDocuments({
      moderationStatus: "approved",
      status: "solved",
    }).exec(),
  ]);

  return { problems, validations, solutions, solved };
}

export interface AdminStats {
  totalUsers: number;
  totalProblems: number;
  totalSolutions: number;
  totalComments: number;
  problemsSolved: number;
  reportsPending: number;
  moderationPending: number;
  commentsToday: number;
  newUsersToday: number;
  categoriesPending: number;
  waitlistPending: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  await connectToDatabase();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalProblems,
    totalSolutions,
    totalComments,
    problemsSolved,
    reportsPending,
    problemsPending,
    solutionsPending,
    commentsPending,
    commentsToday,
    newUsersToday,
    categoriesPending,
    waitlistPending,
  ] = await Promise.all([
    User.estimatedDocumentCount().exec(),
    Problem.countDocuments({ moderationStatus: { $ne: "removed" } }).exec(),
    Solution.countDocuments({ moderationStatus: { $ne: "removed" } }).exec(),
    Comment.countDocuments({ moderationStatus: { $ne: "removed" } }).exec(),
    Problem.countDocuments({ status: "solved" }).exec(),
    Report.countDocuments({ status: "pending" }).exec(),
    Problem.countDocuments({ moderationStatus: "pending" }).exec(),
    Solution.countDocuments({ moderationStatus: "pending" }).exec(),
    Comment.countDocuments({ moderationStatus: "pending" }).exec(),
    Comment.countDocuments({ createdAt: { $gte: startOfToday } }).exec(),
    User.countDocuments({ createdAt: { $gte: startOfToday } }).exec(),
    Category.countDocuments({ status: "pending" }).exec(),
    WaitlistSignup.countDocuments({ status: "pending" }).exec(),
  ]);

  return {
    totalUsers,
    totalProblems,
    totalSolutions,
    totalComments,
    problemsSolved,
    reportsPending,
    moderationPending: problemsPending + solutionsPending + commentsPending,
    commentsToday,
    newUsersToday,
    categoriesPending,
    waitlistPending,
  };
}
