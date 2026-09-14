/**
 * Importing this barrel guarantees every schema is registered with Mongoose
 * before any `populate()` call needs it.
 */
export { User, type IUser } from "./User";
export { Category, type ICategory } from "./Category";
export {
  Problem,
  computeHotScore,
  problemSignal,
  type IProblem,
  type PostImage,
  type ProblemLocation,
  type ModerationMeta,
} from "./Problem";
export { Solution, type ISolution } from "./Solution";
export { Comment, type IComment } from "./Comment";
export {
  ProblemValidation,
  SolutionVote,
  CommentVote,
  type IProblemValidation,
  type ISolutionVote,
  type ICommentVote,
} from "./Vote";
export {
  Report,
  type IReport,
  type ReportTargetType,
  type ReportStatus,
} from "./Report";
export { Notification, type INotification } from "./Notification";
export { Setting, type ISetting } from "./Setting";
export { RateLimit, type IRateLimit } from "./RateLimit";
export { AuditLog, type IAuditLog } from "./AuditLog";
