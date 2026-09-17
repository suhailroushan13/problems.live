import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
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
    <div className="flex min-w-0 items-center gap-3 border-b border-hairline py-3 last:border-b-0">
      <span className={destructive ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive" : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted-foreground"}>
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={destructive ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-foreground"}>
          {label}
        </p>
        <p className="truncate text-xs text-muted-foreground">{value}</p>
        {description ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SettingsCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-elevated px-4 py-3 shadow-[0_1px_0_rgb(0_0_0_/_0.02)] sm:px-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold tracking-[-0.015em] text-foreground">{title}</h2>
        <span className="label text-[10px] text-muted-foreground">{eyebrow}</span>
      </div>
      <div>{children}</div>
    </section>
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
    <main className="page max-w-5xl py-5 sm:py-7 lg:py-8">
      <header className="mb-5 flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-brand">Account center</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">
            Settings
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-right">
          Your profile, private defaults, and sign-in security in one place.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SettingsCard title="Profile" eyebrow="PUBLIC">
          <SettingRow
            icon={UserRound}
            label="Profile"
            value={`u/${user.username}`}
            description="Name, bio, links, and profile photo."
            action={
              <Button asChild variant="ghost" size="sm" className="cursor-pointer" aria-label="Edit profile">
                <Link href="/settings/profile"><ChevronRight /></Link>
              </Button>
            }
          />
          <SettingRow
            icon={Mail}
            label="Email address"
            value={user.email}
            description="Verified and managed by Google."
            action={<ShieldCheck className="mt-2 size-4 text-brand" aria-label="Verified" />}
          />
        </SettingsCard>

        <SettingsCard title="Private defaults" eyebrow="ONLY YOU">
          <div className="flex items-center justify-between gap-3 border-b border-hairline py-3">
            <p className="text-xs leading-snug text-muted-foreground">
              Used to tailor your experience. None of these details are public.
            </p>
            <AccountPreferencesButton defaults={{ phone: user.phone, gender: user.gender, defaultLocation: user.defaultLocation }} />
          </div>
          <SettingRow
            icon={Smartphone}
            label="Phone number"
            value={user.phone || "Not connected"}
            description="Optional; never used for sign-in."
          />
          <SettingRow
            icon={UserRound}
            label="Gender"
            value={ACCOUNT_GENDER_LABELS[user.gender]}
            description="Optional and never shown publicly."
          />
          <SettingRow
            icon={MapPin}
            label="Default location"
            value={locationLabel(user.defaultLocation)}
            description="Prefills posts; you can change it each time."
          />
        </SettingsCard>

        <SettingsCard title="Sign-in security" eyebrow="PROTECTED">
          <SettingRow
            icon={KeyRound}
            label="Google account"
            value="Sign in with Google"
            description="Your password and recovery are managed by Google."
            action={<Button asChild variant="ghost" size="sm" className="cursor-pointer"><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Manage <ExternalLink /></a></Button>}
          />
          <SettingRow
            icon={KeyRound}
            label="Passkey"
            value={hasPasskey ? "Passkey set up" : "Not set up"}
            description={hasPasskey ? "Your device lock or security key can sign you in." : "Use a device lock, fingerprint, or security key."}
            action={<PasskeySetupButton />}
          />
        </SettingsCard>

        <SettingsCard title="Account removal" eyebrow="IRREVERSIBLE">
          <SettingRow
            icon={Trash2}
            label="Delete account"
            value="Permanently delete this account"
            description="Public contributions remain anonymous to preserve discussions."
            action={<DeleteAccountButton username={user.username} />}
            destructive
          />
        </SettingsCard>
      </div>
    </main>
  );
}
