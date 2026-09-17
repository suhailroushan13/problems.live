import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function SuhailLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (user?.isAdmin) redirect("/admin");

  return (
    <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12">
      <section className="mx-auto w-full max-w-sm rounded-2xl border border-hairline bg-card p-7 shadow-sm">
        <ShieldCheck className="size-8 text-brand" aria-hidden="true" />
        <p className="label mt-5 text-brand">Restricted access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Continue with an authorised Google account to access the control room.
        </p>
        {params.error ? (
          <p className="mt-5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            This Google account is not authorised for admin access.
          </p>
        ) : null}
        <Button asChild className="mt-6 w-full">
          <a href="/api/auth/google?next=%2Fsuhail%2Fcomplete">Continue with Google</a>
        </Button>
      </section>
    </main>
  );
}
