/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Lightbulb,
  LockKeyhole,
  MessageSquare,
  Users,
} from "lucide-react";
import { PasskeySignInButton } from "@/components/auth/passkey-buttons";
import { SignInButton } from "@/components/shared/sign-in-button";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const BENEFITS = [
  { icon: Users, title: "Real people", body: "Share and help" },
  { icon: MessageSquare, title: "Real problems", body: "Honest discussions" },
  { icon: Lightbulb, title: "Real solutions", body: "Learn together" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(`/api/auth/google?next=${encodeURIComponent(destination)}`);
  /* Invite-only pause: retain the sign-in experience for later.
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="grid min-h-[calc(100svh-4rem)] overflow-hidden md:grid-cols-2">
      <section className="relative hidden min-h-[37rem] items-center overflow-hidden bg-background px-5 py-12 sm:px-10 md:flex md:min-h-[calc(100svh-4rem)] md:px-12 lg:px-16">
        <Link
          href="/"
          className="absolute top-6 left-4 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 sm:top-8 sm:left-8"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Back</span>
        </Link>

        <div className="relative z-10 mx-auto w-full max-w-[34rem] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <p className="label text-brand">problems.live</p>
          <h1 className="mt-5 text-balance text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.055em] text-foreground sm:text-[3rem] lg:text-[3.5rem]">
            Everyone has
            <br />
            a problem.
            <span className="mt-3 block text-brand">
              Someone might have
              <br />
              a solution.
            </span>
          </h1>
          <p className="mt-6 max-w-[31rem] text-[1rem] leading-7 text-muted-foreground sm:text-[1.0625rem] sm:leading-8">
            A place to share real problems, get advice from real people, and help others figure things out.
          </p>

          <div className="mt-9 hidden grid-cols-3 gap-5 md:grid">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="min-w-0">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-muted text-brand">
                  <benefit.icon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{benefit.title}</p>
                <p className="mt-1 text-[0.8125rem] leading-5 text-muted-foreground">{benefit.body}</p>
              </div>
            ))}
          </div>

        </div>

      </section>

      <section className="relative flex min-h-[calc(100svh-4rem)] items-center bg-[#f8faff] px-4 py-10 sm:px-8 md:px-12">
        <div className="mx-auto w-full max-w-[28rem] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="sm:px-10" aria-labelledby="sign-in-title">
            <h2 id="sign-in-title" className="text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] text-foreground sm:text-[1.875rem]">
              Welcome back
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
              Sign in to continue to problems.live.
            </p>

            <div className="mt-8 grid gap-3">
              <SignInButton next={destination} className="h-14 w-full rounded-xl text-[0.9375rem] shadow-none">
                Continue with Google
              </SignInButton>
              <PasskeySignInButton next={destination} className="h-14 w-full rounded-xl text-[0.9375rem]" />
            </div>

            <p className="mt-6 flex items-start gap-2 text-[0.8125rem] leading-5 text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
              Your account is only used to keep your problems and profile connected.
            </p>
          </div>

        </div>
      </section>
    </main>
  );
  */
}
