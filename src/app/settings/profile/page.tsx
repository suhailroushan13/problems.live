import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { AvatarPicker } from "@/components/forms/avatar-picker";
import { ProfileForm } from "@/components/forms/profile-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/google?next=/settings/profile");

  await connectToDatabase();
  const profile = await User.findById(toObjectId(user.id), {
    bio: 1,
    socialLinks: 1,
    usernameChangedAt: 1,
    dateOfBirth: 1,
    avatar: 1,
    avatarType: 1,
    avatarStyle: 1,
    avatarSeed: 1,
    avatarUrl: 1,
    googleAvatarUrl: 1,
  }).lean().exec();

  return (
    <main className="page flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col justify-center py-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 gap-1.5">
          <Link href="/settings"><ArrowLeft /> Account settings</Link>
        </Button>
        <header className="mb-6">
          <p className="label text-muted-foreground">Profile</p>
          <h1 className="mt-1 text-[1.75rem] font-bold tracking-[-0.03em] text-foreground sm:text-[2.25rem]">Edit profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage what people see when they visit your profile.</p>
        </header>
        <section>
          <ProfileForm
            defaults={{
              name: user.name,
              username: user.username,
              bio: profile?.bio,
              socialLinks: profile?.socialLinks,
              dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : undefined,
            }}
            canChangeUsername={!profile?.usernameChangedAt}
            canSetDateOfBirth={!profile?.dateOfBirth}
            avatarSlot={
              <AvatarPicker
                name={user.name}
                username={user.username}
                avatar={profile?.avatar ?? user.avatar}
                avatarType={profile?.avatarType}
                avatarStyle={profile?.avatarStyle}
                avatarSeed={profile?.avatarSeed}
                uploadedAvatarUrl={profile?.avatarUrl}
                googleAvatarUrl={profile?.googleAvatarUrl}
                showLabel
              />
            }
          />
        </section>
      </div>
    </main>
  );
}
