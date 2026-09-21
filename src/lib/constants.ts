/**
 * Shared, client-safe constants. No secrets, no server imports.
 */

export const GITHUB_REPO_URL =
  "https://github.com/suhailroushan13/problems.live";

/** The only person who invites new users — see /wait-list. */
export const ACCESS_CONTACT_X_HANDLE = "0xsuhailroushan";
export const ACCESS_CONTACT_X_URL = `https://x.com/${ACCESS_CONTACT_X_HANDLE}`;

export const PROBLEM_STATUSES = [
  "open",
  "needs_collaborators",
  "being_solved",
  "solved",
  "not_relevant",
] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  open: "Open",
  needs_collaborators: "Needs collaborators",
  being_solved: "Being solved",
  solved: "Solved",
  not_relevant: "No longer relevant",
};

/**
 * A quiet priority tag the author sets when posting — "normal" is the silent
 * default and never renders a badge (see PriorityBadge), matching how
 * PROBLEM_STATUSES treats "open" as the unlabeled default state.
 */
export const PROBLEM_PRIORITIES = ["normal", "important", "urgent"] as const;
export type ProblemPriority = (typeof PROBLEM_PRIORITIES)[number];

export const PROBLEM_PRIORITY_LABELS: Record<ProblemPriority, string> = {
  normal: "Normal",
  important: "Important",
  urgent: "Urgent",
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

/**
 * Social/portfolio links a user can attach to their profile. Handle-kind
 * platforms store a bare handle (no "@", no domain) and `baseUrl` builds the
 * profile link for display; the url-kind entry (a personal site) stores a
 * full URL as-is. `maxLength` matches each platform's real handle limit.
 */
export const SOCIAL_PLATFORMS = [
  {
    key: "website",
    label: "Portfolio",
    kind: "url",
    baseUrl: "",
    maxLength: 200,
    placeholder: "yoursite.com",
  },
  {
    key: "x",
    label: "X",
    kind: "handle",
    baseUrl: "https://x.com/",
    maxLength: 15,
    placeholder: "username",
  },
  {
    key: "instagram",
    label: "Instagram",
    kind: "handle",
    baseUrl: "https://instagram.com/",
    maxLength: 30,
    placeholder: "username",
  },
  {
    key: "github",
    label: "GitHub",
    kind: "handle",
    baseUrl: "https://github.com/",
    maxLength: 39,
    placeholder: "username",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    kind: "handle",
    baseUrl: "https://linkedin.com/in/",
    maxLength: 100,
    placeholder: "username",
  },
  {
    key: "producthunt",
    label: "Product Hunt",
    kind: "handle",
    baseUrl: "https://www.producthunt.com/@",
    maxLength: 40,
    placeholder: "username",
  },
] as const;
export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]["key"];

export type SocialLinks = Partial<Record<SocialPlatformKey, string>>;

export const LOCATION_SCOPES = ["global", "country", "city"] as const;
export type LocationScope = (typeof LOCATION_SCOPES)[number];

/** Private account-preference values. These are never shown on public profiles. */
export const ACCOUNT_GENDERS = [
  "not_specified",
  "woman",
  "man",
  "nonbinary",
  "prefer_not_to_say",
] as const;
export type AccountGender = (typeof ACCOUNT_GENDERS)[number];

export const ACCOUNT_GENDER_LABELS: Record<AccountGender, string> = {
  not_specified: "Not specified",
  woman: "Woman",
  man: "Man",
  nonbinary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

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
  "discussed",
  "newest",
  "updated",
  "unsolved",
  "oldest",
  "clicks",
  "solutions",
] as const;
export type ProblemSort = (typeof PROBLEM_SORTS)[number];

export const PROBLEM_SORT_LABELS: Record<ProblemSort, string> = {
  validated: "Most upvoted",
  clicks: "Most clicked",
  trending: "Trending",
  newest: "Newest",
  updated: "Recently updated",
  unsolved: "Unsolved",
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
  COMMENT_AWARDED: 5,
  PROBLEM_SOLVED: 15,
  SOLUTION_ACCEPTED: 25,
  CONTENT_REMOVED: -10,
} as const;

/** Trust tiers unlock capability rather than gating basic participation. */
export const TRUST_TIERS = [
  { key: "new", label: "New", minReputation: 0 },
  { key: "regular", label: "Regular", minReputation: 25 },
  { key: "trusted", label: "Trusted", minReputation: 150 },
  { key: "expert", label: "Expert", minReputation: 500 },
] as const;
export type TrustTier = (typeof TRUST_TIERS)[number]["key"];

export const PAGE_SIZE = 20;
export const COMMENT_PAGE_SIZE = 30;

/** Minimum age, in years, to set a date of birth on the platform. */
export const MIN_ACCOUNT_AGE_YEARS = 13;

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
  {
    name: "Work",
    slug: "work",
    icon: "Briefcase",
    description: "Jobs, hiring, careers, remote work, and workplace culture.",
  },
  {
    name: "Education",
    slug: "education",
    icon: "GraduationCap",
    description:
      "Learning, schools, universities, skills, and access to knowledge.",
  },
  {
    name: "Housing",
    slug: "housing",
    icon: "Home",
    description: "Renting, buying, roommates, landlords, and where we live.",
  },
  {
    name: "Money",
    slug: "money",
    icon: "Wallet",
    description: "Banking, debt, payments, taxes, and investing.",
  },
  {
    name: "Health",
    slug: "health",
    icon: "Stethoscope",
    description: "Healthcare access, mental health, fitness, and wellbeing.",
  },
  {
    name: "Relationships",
    slug: "relationships",
    icon: "HeartHandshake",
    description: "Friendship, dating, and staying connected.",
  },
  {
    name: "Family",
    slug: "family",
    icon: "Baby",
    description: "Parenting, childcare, elder care, and family logistics.",
  },
  {
    name: "Transportation",
    slug: "transportation",
    icon: "Bus",
    description: "Commuting, transit, cars, cycling, and getting around.",
  },
  {
    name: "Food",
    slug: "food",
    icon: "UtensilsCrossed",
    description: "Groceries, cooking, restaurants, nutrition, and food access.",
  },
  {
    name: "Shopping",
    slug: "shopping",
    icon: "ShoppingBag",
    description: "Retail, e-commerce, returns, pricing, and consumer rights.",
  },
  {
    name: "Technology",
    slug: "technology",
    icon: "Cpu",
    description:
      "Software, hardware, the internet, and the tools we build with.",
  },
  {
    name: "Government",
    slug: "government",
    icon: "Landmark",
    description: "Policy, bureaucracy, civic life, and public institutions.",
  },
  {
    name: "Community",
    slug: "community",
    icon: "Users",
    description: "Neighbourhoods, local services, and the people around us.",
  },
  {
    name: "Environment",
    slug: "environment",
    icon: "Leaf",
    description: "Climate, waste, energy, pollution, and the natural world.",
  },
  {
    name: "Other",
    slug: "other",
    icon: "Shapes",
    description: "Everything that does not fit anywhere else yet.",
  },
];

/**
 * Usernames nobody but us should be able to claim: every top-level route
 * (a matching username would collide with a real page), auth/account
 * vocabulary reserved defensively for routes that don't exist yet, staff-
 * sounding handles that would let someone impersonate the team, and the
 * brand itself. Checked at both signup auto-provisioning and manual edit —
 * see `src/lib/auth/provision.ts` and `src/actions/auth.ts`.
 */
export const RESERVED_USERNAMES = new Set([
  // Real top-level routes.
  "admin",
  "api",
  "categories",
  "guidelines",
  "leaderboard",
  "notifications",
  "problems",
  "settings",
  "solutions",
  "u",
  // Auth/account vocabulary — reserved even though today's auth lives under
  // /api/auth, so a future route can never collide with someone's handle.
  "login",
  "logout",
  "signin",
  "signout",
  "sign-in",
  "sign-up",
  "signup",
  "register",
  "password",
  "verify",
  "oauth",
  "callback",
  "session",
  "account",
  "accounts",
  "me",
  "you",
  "new",
  "edit",
  "delete",
  "create",
  // Staff / official-sounding handles.
  "support",
  "help",
  "moderator",
  "moderators",
  "mod",
  "mods",
  "official",
  "staff",
  "team",
  "contact",
  "security",
  "abuse",
  "report",
  "legal",
  "privacy",
  "terms",
  "dmca",
  "root",
  "superuser",
  "sysadmin",
  "webmaster",
  // The brand.
  "problemslive",
  "problems-live",
  "problems.live",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}
