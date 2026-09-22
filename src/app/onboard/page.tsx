import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";
import { getSetting } from "@/lib/config/settings";
import { toObjectId } from "@/lib/utils/sanitize-query";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const destination = safeNext(next);

  if (!user) redirect(`/api/auth/google?next=${encodeURIComponent(`/onboard?next=${destination}`)}`);

  await connectToDatabase();
  const [account, startingCredits] = await Promise.all([
    User.findById(toObjectId(user.id), {
      dateOfBirth: 1,
      onboardedAt: 1,
      avatar: 1,
      avatarType: 1,
      avatarStyle: 1,
      avatarSeed: 1,
      avatarUrl: 1,
      googleAvatarUrl: 1,
    }).lean().exec(),
    getSetting("startingProblemCredits"),
  ]);

  if (account?.onboardedAt ?? account?.dateOfBirth) redirect(destination);

  return (
    <main className="page flex min-h-[calc(100vh-16rem)] items-center py-12 sm:py-16">
      <div className="w-full rounded-2xl border border-hairline bg-elevated p-6 sm:p-10">
        <p className="label text-brand">Account setup</p>
        <h1 className="mt-3 text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
          Choose how you appear here.
        </h1>
        <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
          Use a name that feels separate from your Google account. A generated option is a good starting point if you would rather stay anonymous.
        </p>
        <p className="mt-3 text-sm font-medium text-brand">
          You have {startingCredits} Credits to post your first problems. Credits are posting currency, not real money.
        </p>
        <div className="mt-9">
          <OnboardingForm
            initialUsername={user.username}
            next={destination}
            name={user.name}
            avatar={account?.avatar ?? user.avatar}
            avatarType={account?.avatarType}
            avatarStyle={account?.avatarStyle}
            avatarSeed={account?.avatarSeed}
            uploadedAvatarUrl={account?.avatarUrl}
            googleAvatarUrl={account?.googleAvatarUrl}
          />
        </div>
      </div>
    </main>
  );
}
