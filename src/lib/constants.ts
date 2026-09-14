/**
 * Shared, client-safe constants. No secrets, no server imports.
 */

export const PROBLEM_STATUSES = [
  "open",
  "being_solved",
  "solved",
  "not_relevant",
] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  open: "Open",
  being_solved: "Being solved",
  solved: "Solved",
  not_relevant: "No longer relevant",
};

export const MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "removed",
] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const SOLUTION_STATUSES = ["proposed", "building", "shipped"] as const;
export type SolutionStatus = (typeof SOLUTION_STATUSES)[number];

export const SOLUTION_STATUS_LABELS: Record<SolutionStatus, string> = {
  proposed: "Proposed",
  building: "Being built",
  shipped: "Shipped",
};

export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LOCATION_SCOPES = ["global", "country", "city"] as const;
export type LocationScope = (typeof LOCATION_SCOPES)[number];

export const REPORT_REASONS = [
  "spam",
  "vulgar",
  "harassment",
  "hate",
  "threat",
  "personal_info",
  "scam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or advertising",
  vulgar: "Vulgar or abusive",
  harassment: "Harassment",
  hate: "Hate speech",
  threat: "Threat or violence",
  personal_info: "Personal information",
  scam: "Scam or fraud",
  other: "Something else",
};

export const NOTIFICATION_TYPES = [
  "problem_validated",
  "problem_commented",
  "comment_replied",
  "solution_suggested",
  "solution_voted",
  "comment_voted",
  "problem_being_solved",
  "problem_solved",
  "content_removed",
  "content_approved",
  "category_approved",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Client-safe copy for each notification type. */
export const NOTIFICATION_COPY: Record<NotificationType, string> = {
  problem_validated: "also has your problem",
  problem_commented: "commented on your problem",
  comment_replied: "replied to your comment",
  solution_suggested: "suggested a solution to your problem",
  solution_voted: "found your solution helpful",
  comment_voted: "found your comment helpful",
  problem_being_solved: "is working on your problem",
  problem_solved: "marked your problem as solved",
  content_removed: "Your content was removed by a moderator",
  content_approved: "Your post passed review and is now public",
  category_approved: "The category you suggested was approved",
};

export function notificationCopy(type: NotificationType): string {
  return NOTIFICATION_COPY[type] ?? "sent you an update";
}

export const PROBLEM_SORTS = [
  "trending",
  "validated",
  "newest",
  "oldest",
  "discussed",
  "solutions",
] as const;
export type ProblemSort = (typeof PROBLEM_SORTS)[number];

export const PROBLEM_SORT_LABELS: Record<ProblemSort, string> = {
  trending: "Trending",
  validated: "Most validated",
  newest: "Newest",
  oldest: "Oldest",
  discussed: "Most discussed",
  solutions: "Most solutions",
};

export const SOLUTION_SORTS = ["helpful", "newest", "trending"] as const;
export type SolutionSort = (typeof SOLUTION_SORTS)[number];

export const SOLUTION_SORT_LABELS: Record<SolutionSort, string> = {
  helpful: "Most helpful",
  newest: "Newest",
  trending: "Trending",
};

/** Reputation awarded for each positive signal. Kept small and un-gamified. */
export const REPUTATION = {
  PROBLEM_VALIDATED: 2,
  SOLUTION_HELPFUL: 3,
  COMMENT_HELPFUL: 1,
  PROBLEM_SOLVED: 15,
  SOLUTION_ACCEPTED: 25,
  CONTENT_REMOVED: -10,
} as const;

/** Trust tiers unlock capability rather than gating basic participation. */
export const TRUST_TIERS = [
  { key: "new", label: "New", minReputation: 0 },
  { key: "member", label: "Member", minReputation: 25 },
  { key: "trusted", label: "Trusted", minReputation: 150 },
  { key: "veteran", label: "Veteran", minReputation: 600 },
] as const;
export type TrustTier = (typeof TRUST_TIERS)[number]["key"];

export const PAGE_SIZE = 20;
export const COMMENT_PAGE_SIZE = 30;

export const MAX_IMAGES_PER_POST = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const SEED_CATEGORIES = [
  { name: "Technology", slug: "technology", icon: "Cpu", description: "Software, hardware, the internet, and the tools we build with." },
  { name: "Education", slug: "education", icon: "GraduationCap", description: "Learning, schools, universities, skills, and access to knowledge." },
  { name: "Work", slug: "work", icon: "Briefcase", description: "Jobs, hiring, careers, remote work, and workplace culture." },
  { name: "Housing", slug: "housing", icon: "Home", description: "Renting, buying, roommates, landlords, and where we live." },
  { name: "Finance", slug: "finance", icon: "Wallet", description: "Money, banking, debt, payments, taxes, and investing." },
  { name: "Relationships", slug: "relationships", icon: "HeartHandshake", description: "Friendship, dating, community, and staying connected." },
  { name: "Transportation", slug: "transportation", icon: "Bus", description: "Commuting, transit, cars, cycling, and getting around." },
  { name: "Health", slug: "health", icon: "Stethoscope", description: "Healthcare access, mental health, fitness, and wellbeing." },
  { name: "Environment", slug: "environment", icon: "Leaf", description: "Climate, waste, energy, pollution, and the natural world." },
  { name: "Food", slug: "food", icon: "UtensilsCrossed", description: "Groceries, cooking, restaurants, nutrition, and food access." },
  { name: "Society", slug: "society", icon: "Landmark", description: "Government, policy, civic life, and public institutions." },
  { name: "Shopping", slug: "shopping", icon: "ShoppingBag", description: "Retail, e-commerce, returns, pricing, and consumer rights." },
  { name: "Family", slug: "family", icon: "Baby", description: "Parenting, childcare, elder care, and family logistics." },
  { name: "Travel", slug: "travel", icon: "Plane", description: "Flights, visas, hotels, and moving across borders." },
  { name: "Local Problems", slug: "local-problems", icon: "MapPin", description: "Neighbourhood issues that only locals really feel." },
  { name: "Other", slug: "other", icon: "Shapes", description: "Everything that does not fit anywhere else yet." },
];
