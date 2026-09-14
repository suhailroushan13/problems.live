import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Category,
  Comment,
  Problem,
  ProblemValidation,
  Report,
  Solution,
  User,
} from "@/models";

export interface PlatformStats {
  problems: number;
  validations: number;
  solutions: number;
  solved: number;
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
  };
}
