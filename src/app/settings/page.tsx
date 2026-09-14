import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/forms/profile-form";
import { SignOutSection } from "@/components/forms/sign-out-section";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { formatCount } from "@/lib/utils/format";
import { TRUST_TIERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/google?next=/settings");

  await connectToDatabase();
  const doc = await User.findById(toObjectId(user.id), { bio: 1, problemCredits: 1 })
    .lean()
    .exec();

  const tier = TRUST_TIERS.find((t) => t.key === user.trust);
  const nextTier = TRUST_TIERS.find((t) => t.minReputation > user.reputation);

  return (
    <div className="page max-w-2xl py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Settings
        </h1>
      </header>

      <div className="mb-12 grid gap-6 border-y border-hairline py-6 sm:grid-cols-2">
        <div>
          <p className="num text-xl font-semibold text-foreground">
            {formatCount(user.reputation)}
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            Reputation · {tier?.label} tier
            {nextTier
              ? `, ${formatCount(
                  nextTier.minReputation - user.reputation
                )} to ${nextTier.label}`
              : ""}
          </p>
        </div>

        <div>
          <p className="num text-xl font-semibold text-foreground">
            {formatCount(doc?.problemCredits ?? 0)}
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            Problem credits · you earn these back when your problems get
            validated.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="mb-6 text-xl font-bold tracking-[-0.02em] text-foreground">Profile</h2>
        <ProfileForm
          defaults={{
            name: user.name,
            username: user.username,
            bio: doc?.bio,
          }}
        />
      </section>

      <section className="border-t border-hairline pt-10">
        <h2 className="mb-2 text-xl font-bold tracking-[-0.02em] text-foreground">Account</h2>
        <p className="mb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">
          You are signed in with Google as{" "}
          <span className="font-medium text-foreground">{user.email}</span>.
          There is no password to manage.
        </p>
        <SignOutSection />
      </section>
    </div>
  );
}
