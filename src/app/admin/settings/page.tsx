import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingRow } from "@/components/admin/settings-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getSettings,
  SETTING_DEFAULTS,
  type SettingKey,
} from "@/lib/config/settings";

export const metadata: Metadata = { title: "Settings" };

/**
 * Operator-tunable knobs. Everything here is read at request time by the code
 * that uses it, so a change takes effect within a minute without a deploy.
 */
const COPY: Record<SettingKey, { label: string; description: string }> = {
  startingProblemCredits: {
    label: "Starting Credits (default: 10)",
    description:
      "Posting currency granted to a brand new account. Each new problem costs one Credit.",
  },
  creditsPerValidatedProblem: {
    label: "Credits per validated problem",
    description:
      "Credits returned once a problem crosses the validation threshold.",
  },
  validationsToEarnCredit: {
    label: "Validations to earn a credit",
    description:
      "How many people must say “I have this problem” before the author earns a credit back.",
  },
  maxProblemCredits: {
    label: "Maximum credits",
    description: "The ceiling on banked credits, so they cannot be stockpiled.",
  },
  reputationToSuggestCategory: {
    label: "Score required to suggest a category",
    description: "Guards the taxonomy without blocking normal participation.",
  },
  reputationToReport: {
    label: "Score required to report",
    description:
      "Minimum community Score (reputation) before reports are accepted. 0 means anyone can report.",
  },
  reportsToAutoHide: {
    label: "Reports before auto-hide",
    description:
      "Distinct reports that hide content pending review. Never deletes anything.",
  },
  moderationHoldThreshold: {
    label: "Moderation hold threshold",
    description:
      "Score (0–1) at which new content is held for a human to review.",
  },
  moderationRejectThreshold: {
    label: "Moderation reject threshold",
    description:
      "Score (0–1) at which content is refused outright at post time.",
  },
  duplicateSimilarityThreshold: {
    label: "Duplicate similarity threshold",
    description:
      "Similarity (0–1) above which we warn the author about a possible duplicate.",
  },
  rateLimitProblemCreate: {
    label: "Rate limit · new problems",
    description: "Format: max, window seconds.",
  },
  rateLimitCommentCreate: {
    label: "Rate limit · comments",
    description: "Format: max, window seconds.",
  },
  rateLimitSolutionCreate: {
    label: "Rate limit · solutions",
    description: "Format: max, window seconds.",
  },
  rateLimitReportCreate: {
    label: "Rate limit · reports",
    description: "Format: max, window seconds.",
  },
  rateLimitVote: {
    label: "Rate limit · votes",
    description: "Format: max, window seconds.",
  },
  rateLimitBookmark: {
    label: "Rate limit · bookmarks",
    description: "Format: max, window seconds.",
  },
  rateLimitProblemClick: {
    label: "Rate limit · problem clicks",
    description:
      "Format: max, window seconds. Protects click tracking from automated traffic.",
  },
  rateLimitSearch: {
    label: "Rate limit · search",
    description:
      "Format: max, window seconds. Applies per user, or per IP when signed out.",
  },
  rateLimitUpload: {
    label: "Rate limit · uploads",
    description: "Format: max, window seconds.",
  },
  rateLimitUsernameCheck: {
    label: "Rate limit · username availability checks",
    description:
      "Format: max, window seconds. Guards the live check while typing a new username.",
  },
  rateLimitWaitlistJoin: {
    label: "Rate limit · waitlist signups",
    description:
      "Format: max, window seconds. Guards the public waitlist form on /wait-list.",
  },
};

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/admin");

  const settings = await getSettings();
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];

  return (
    <div className="divide-y divide-hairline rounded-xl border border-hairline bg-elevated">
      {keys.map((key) => {
        const value = settings[key];
        const isPair = Array.isArray(SETTING_DEFAULTS[key]);

        return (
          <SettingRow
            key={key}
            settingKey={key}
            label={COPY[key].label}
            description={COPY[key].description}
            value={Array.isArray(value) ? value.join(", ") : String(value)}
            isPair={isPair}
          />
        );
      })}
    </div>
  );
}
