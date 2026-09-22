import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { PageBackButton } from "@/components/navigation/page-back-button";
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
  // Admin accounts may have existed before onboarding was introduced; their
  // correct landing place is the control dashboard, never setup.
  if (user.isAdmin) redirect("/admin");

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
    <main className="onboard-page relative isolate overflow-hidden bg-tint">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-brand-muted to-transparent" />
      <div className="page-wide flex min-h-[calc(100dvh-3.75rem)] items-center py-6 sm:py-10 lg:py-4">
        <div className="grid w-full overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-[0_18px_55px_rgb(15_23_42_/_0.08)] lg:grid-cols-[0.82fr_1.18fr]">
          <section className="relative hidden overflow-hidden border-b border-hairline bg-foreground px-5 py-7 text-background sm:px-8 sm:py-9 lg:block lg:border-r lg:border-b-0 lg:px-10 lg:py-6 xl:px-14">
            <span aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-16 select-none text-[12rem] leading-none font-black tracking-[-0.12em] text-background/5 sm:text-[16rem] lg:text-[19rem]">01</span>
            <div className="relative flex h-full flex-col">
              <p className="label text-brand-soft">Set up your account</p>

              <div className="mt-7 lg:mt-auto lg:pb-6">
                <h1 className="max-w-md text-[2.15rem] leading-[0.98] font-extrabold tracking-[-0.055em] sm:text-5xl lg:text-[3.5rem]">
                  Make your first impression count.
                </h1>
                <p className="mt-5 max-w-sm text-sm leading-6 text-background/65 sm:text-[0.9375rem] sm:leading-7">
                  Pick the name and photo people will recognise when you share a problem or help solve one.
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-xl border border-background/10 bg-background/5 p-3.5 backdrop-blur-sm">
                  <Sparkles className="size-4 text-brand-soft" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{startingCredits} credits ready</p>
                  <p className="mt-1 text-xs leading-5 text-background/60">For sharing your first problem.</p>
                </div>
                <div className="rounded-xl border border-background/10 bg-background/5 p-3.5 backdrop-blur-sm">
                  <ShieldCheck className="size-4 text-brand-soft" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">Your choices stay yours</p>
                  <p className="mt-1 text-xs leading-5 text-background/60">Edit your profile anytime in settings.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-6 xl:px-14">
            <div className="mx-auto max-w-xl">
              <div className="mb-5 lg:mb-3">
                <PageBackButton embedded />
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5 lg:pb-4">
                <div>
                  <p className="label text-brand">Your public identity</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-[1.75rem]">A few details, then you&apos;re in.</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your Google name is a starting point. Make it feel like you.</p>
                </div>
                <span className="mt-1 hidden size-8 items-center justify-center rounded-full bg-success-subtle text-success sm:inline-flex">
                  <Check className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-7 lg:mt-5">
          <OnboardingForm
            initialUsername={user.username}
            next={destination}
            name={user.name}
            // Prefer the saved selection. Google is a first-run fallback only:
            // otherwise choosing a generated or uploaded avatar would appear
            // to do nothing while a Google photo is available.
            avatar={account?.avatar ?? account?.googleAvatarUrl ?? user.avatar}
            avatarType={account?.avatarType ?? (account?.googleAvatarUrl ? "google" : undefined)}
            avatarStyle={account?.avatarStyle}
            avatarSeed={account?.avatarSeed}
            uploadedAvatarUrl={account?.avatarUrl}
            googleAvatarUrl={account?.googleAvatarUrl}
          />
              </div>
            </div>
        </section>
        </div>
      </div>
    </main>
  );
}
