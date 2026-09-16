import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasskeySignInButton } from "@/components/auth/passkey-buttons";
import { SignInButton } from "@/components/shared/sign-in-button";
import { getCurrentUser } from "@/lib/auth/current-user";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <main className="page flex min-h-[calc(100vh-4rem)] items-center justify-center py-10"><section className="w-full max-w-sm rounded-2xl border border-hairline bg-elevated p-6 shadow-sm"><h1 className="text-xl font-semibold text-foreground">Welcome back</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use the sign-in method you set up for problems.live.</p><div className="mt-6 grid gap-3"><PasskeySignInButton next={destination} /><SignInButton next={destination}>Continue with Google</SignInButton></div></section></main>;
}
