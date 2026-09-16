import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountPreferencesButton, DeleteAccountButton } from "@/components/forms/account-settings-actions";
import { PasskeySetupButton } from "@/components/auth/passkey-buttons";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ACCOUNT_GENDER_LABELS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Passkey } from "@/models";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

function SettingRow({
  icon: Icon,
  label,
  value,
  description,
  action,
  destructive = false,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  description?: string;
  action?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-hairline py-4 last:border-b-0">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={destructive ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-foreground"}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{value}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function locationLabel(location: {
  scope: "global" | "country" | "city";
  country?: string;
  region?: string;
  city?: string;
}) {
  if (location.scope === "global") return "Global by default";
  if (location.scope === "country") return location.country ?? "Country not set";
  return [location.city || location.region, location.country].filter(Boolean).join(", ") || "City not set";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  await connectToDatabase();
  const hasPasskey = Boolean(await Passkey.exists({ userId: user.id }));

  return (
    <main className="page max-w-3xl py-8 sm:py-14">
      <header className="mb-8 sm:mb-10">
        <p className="label text-muted-foreground">Account</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
          Manage your account, security, and how problems.live works for you.
        </p>
      </header>

      <section aria-labelledby="general-settings">
        <h2 id="general-settings" className="label mb-2 text-muted-foreground">General</h2>
        <div className="rounded-xl border border-hairline bg-elevated px-4 sm:px-5">
          <SettingRow
            icon={UserRound}
            label="Profile"
            value={`u/${user.username}`}
            description="Your public name, bio, social links, and profile photo."
            action={
              <Button asChild variant="ghost" size="sm" aria-label="Edit profile">
                <Link href="/settings/profile"><ChevronRight /></Link>
              </Button>
            }
          />
          <SettingRow
            icon={Mail}
            label="Email address"
            value={user.email}
            description="Verified and managed by your Google account."
            action={<ShieldCheck className="mt-2 size-4 text-brand" aria-label="Verified" />}
          />
          <SettingRow
            icon={Smartphone}
            label="Phone number"
            value={user.phone || "Not connected"}
            description="Optional and private. It is not used for sign-in or verification."
            action={<AccountPreferencesButton defaults={{ phone: user.phone, gender: user.gender, defaultLocation: user.defaultLocation }} />}
          />
          <SettingRow
            icon={UserRound}
            label="Gender"
            value={ACCOUNT_GENDER_LABELS[user.gender]}
            description="Optional and private. It is never shown on your public profile."
            action={<AccountPreferencesButton defaults={{ phone: user.phone, gender: user.gender, defaultLocation: user.defaultLocation }} />}
          />
          <SettingRow
            icon={MapPin}
            label="Location customization"
            value={locationLabel(user.defaultLocation)}
            description="Prefills new problems only. You can always choose a different location per post."
            action={<AccountPreferencesButton defaults={{ phone: user.phone, gender: user.gender, defaultLocation: user.defaultLocation }} />}
          />
        </div>
      </section>

      <section aria-labelledby="security-settings" className="mt-10">
        <h2 id="security-settings" className="label mb-2 text-muted-foreground">Security</h2>
        <div className="rounded-xl border border-hairline bg-elevated px-4 sm:px-5">
          <SettingRow
            icon={KeyRound}
            label="Password"
            value="Sign in with Google"
            description="Your password is managed by Google, so there is no separate problems.live password."
            action={<Button asChild variant="ghost" size="sm"><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Manage</a></Button>}
          />
          <SettingRow
            icon={KeyRound}
            label="Passkey"
            value={hasPasskey ? "Passkey set up" : "Not set up"}
            description={hasPasskey ? "Use your device lock, fingerprint, or security key to sign in. Google remains available as a recovery sign-in method." : "Add a passkey with your device lock, fingerprint, or security key. Google remains available as a recovery sign-in method."}
            action={<PasskeySetupButton />}
          />
        </div>
      </section>

      <section aria-labelledby="advanced-settings" className="mt-10">
        <h2 id="advanced-settings" className="label mb-2 text-muted-foreground">Advanced</h2>
        <div className="rounded-xl border border-hairline bg-elevated px-4 sm:px-5">
          <SettingRow
            icon={Trash2}
            label="Delete account"
            value="Permanently delete this account"
            description="Your public contributions can remain anonymously so community discussions stay intact."
            action={<DeleteAccountButton username={user.username} />}
            destructive
          />
        </div>
      </section>
    </main>
  );
}
