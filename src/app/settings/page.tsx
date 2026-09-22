import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ExternalLink, Fingerprint, Mail, MapPin, ShieldCheck, Smartphone, Trash2, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountPreferencesButton, DeleteAccountButton } from "@/components/forms/account-settings-actions";
import { PasskeySetupButton } from "@/components/auth/passkey-buttons";
import { SoundMuteToggle } from "@/components/settings/sound-mute-toggle";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ACCOUNT_GENDER_LABELS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Passkey } from "@/models";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

function SettingRow({ icon: Icon, label, value, description, action, href, destructive = false }: {
  icon: typeof Mail; label: string; value: string; description?: string; action?: React.ReactNode; href?: string; destructive?: boolean;
}) {
  const content = <>
    <span className={destructive ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive" : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted-foreground"}><Icon className="size-4" aria-hidden="true" /></span>
    <span className="min-w-0 flex-1">
      <span className={destructive ? "block text-[0.9375rem] font-semibold text-destructive" : "block text-[0.9375rem] font-semibold text-foreground"}>{label}</span>
      <span className="mt-0.5 block truncate text-sm font-medium text-muted-foreground">{value}</span>
      {description ? <span className="mt-0.5 block text-[0.8125rem] leading-5 text-muted-foreground">{description}</span> : null}
    </span>
    {action ? <span className="shrink-0">{action}</span> : null}
    {href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" /> : null}
  </>;
  const className = "group flex min-w-0 items-center gap-3 rounded-xl border-t border-hairline px-2 py-4 transition-colors duration-150 first:border-t-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25";
  return href ? <Link href={href} className={`${className} -mx-2 cursor-pointer hover:bg-sunken`}>{content}</Link> : <div className={className}>{content}</div>;
}

function SettingsCard({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-hairline bg-elevated p-5 shadow-[0_1px_0_rgb(15_23_42_/_0.02)] sm:p-6">
    <div className="flex items-center justify-between gap-3"><h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground">{title}</h2><span className="label shrink-0 text-[0.6875rem] tracking-[0.12em] text-muted-foreground">{status}</span></div>
    <div className="mt-2">{children}</div>
  </section>;
}

function locationLabel(location: { scope: "global" | "country" | "city"; country?: string; region?: string; city?: string }) {
  if (location.scope === "global") return "Global by default";
  if (location.scope === "country") return location.country ?? "Country not set";
  return [location.city || location.region, location.country].filter(Boolean).join(", ") || "City not set";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  await connectToDatabase();
  const hasPasskey = Boolean(await Passkey.exists({ userId: user.id }));

  return <main className="page max-w-[72rem] py-7 sm:py-8 lg:py-10">
    <header className="mb-6 flex flex-col gap-2 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="label text-brand">Account center</p><h1 className="mt-1 text-4xl font-bold tracking-[-0.045em] text-foreground sm:text-[2.625rem]">Settings</h1></div>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">Manage your profile, preferences, and account security.</p>
    </header>

    <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
      <div className="space-y-5 lg:space-y-6">
        <SettingsCard title="Profile" status="PUBLIC">
          <SettingRow icon={UserRound} label="Profile" value={`u/${user.username}`} description="Name, bio, links, and profile photo." href="/settings/profile" />
          <SettingRow icon={Mail} label="Email address" value={user.email} description="Verified and managed by Google." action={<ShieldCheck className="size-4 text-brand" aria-label="Verified email" />} />
        </SettingsCard>
        <SettingsCard title="Interface" status="SOUND"><SettingRow icon={Volume2} label="Click sounds" value="On" description="Taps, toggles, and menu sounds. Turn off to mute them." action={<SoundMuteToggle />} /></SettingsCard>
        <SettingsCard title="Account removal" status="IRREVERSIBLE"><SettingRow icon={Trash2} label="Delete account" value="Permanently delete this account" description="Public contributions remain anonymous." action={<DeleteAccountButton username={user.username} />} destructive /></SettingsCard>
      </div>

      <div className="space-y-5 lg:space-y-6">
        <SettingsCard title="Private defaults" status="PRIVATE">
          <div className="flex items-start justify-between gap-4 pb-3"><p className="max-w-sm text-[0.8125rem] leading-5 text-muted-foreground">Used to personalize your experience. These details are never public.</p><AccountPreferencesButton defaults={{ phone: user.phone, gender: user.gender, defaultLocation: user.defaultLocation }} /></div>
          <div className="border-t border-hairline">
            <SettingRow icon={Smartphone} label="Phone number" value={user.phone || "Not connected"} description="Optional · never used for sign-in" />
            <SettingRow icon={UserRound} label="Gender" value={ACCOUNT_GENDER_LABELS[user.gender]} description="Never shown publicly" />
            <SettingRow icon={MapPin} label="Default location" value={locationLabel(user.defaultLocation)} description="Used as the default for new posts" />
          </div>
        </SettingsCard>
        <SettingsCard title="Sign-in security" status="PROTECTED">
          <SettingRow icon={ShieldCheck} label="Google account" value="Signed in with Google" description="Password and recovery are managed by Google." action={<Button asChild variant="ghost" size="sm"><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Manage <ExternalLink /></a></Button>} />
          <SettingRow icon={Fingerprint} label="Passkey" value={hasPasskey ? "Set up" : "Not set up"} description={hasPasskey ? "Your device lock or security key can sign you in." : "Use a device lock, fingerprint, or security key."} action={<PasskeySetupButton />} />
        </SettingsCard>
      </div>
    </div>
  </main>;
}
