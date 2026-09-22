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
    <main className="page-wide flex min-h-[calc(100vh-16rem)] items-center py-8 sm:py-12 lg:min-h-[calc(100dvh-3.75rem)] lg:py-0">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(31rem,0.9fr)] lg:items-center lg:gap-14 xl:gap-20">
        <section className="lg:py-10 lg:pr-8">
          <p className="label text-brand">Account setup</p>
          <h1 className="mt-3 max-w-xl text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
            Choose how you appear here.
          </h1>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            Your name and username are prefilled from your Google account. Change them if you&apos;d like.
          </p>
          <p className="mt-6 inline-flex rounded-full border border-brand/15 bg-brand-muted px-3 py-1.5 text-sm font-medium text-brand">
            {startingCredits} Credits ready for your first problem
          </p>
        </section>

        <section className="rounded-2xl border border-hairline bg-elevated p-6 sm:p-8 lg:p-7 xl:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Your public identity</h2>
          <p className="mt-1 text-sm text-muted-foreground">You can change this later in settings.</p>
          <div className="mt-6">
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
        </section>
        </div>
    </main>
  );
}
