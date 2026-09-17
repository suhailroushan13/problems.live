"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Home, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinWaitlist } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WaitlistForm() {
  const router = useRouter();
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!confirmationMessage) return;
    const timeout = window.setTimeout(() => router.replace("/"), 5_000);
    return () => window.clearTimeout(timeout);
  }, [confirmationMessage, router]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await joinWaitlist({
        name: form.get("name"),
        email: form.get("email"),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmationMessage(result.message ?? "We received your request and will inform you soon.");
    });
  }

  if (confirmationMessage) {
    return (
      <div className="rounded-xl border border-brand/20 bg-brand-muted p-5 text-center">
        <CheckCircle2 className="mx-auto size-7 text-brand" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-foreground">
          {confirmationMessage}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Check your inbox for confirmation. You&apos;ll be redirected to the home page in 5 seconds.
        </p>
        <Button asChild variant="outline" className="mt-5 w-full bg-background">
          <Link href="/"><Home /> Go to home page now</Link>
        </Button>
      </div>
    );
  }

  return <form onSubmit={submit} className="space-y-4" noValidate>
    <div className="space-y-2"><Label htmlFor="waitlist-name">Name</Label><Input id="waitlist-name" name="name" autoComplete="name" maxLength={80} required /></div>
    <div className="space-y-2"><Label htmlFor="waitlist-email">Email</Label><Input id="waitlist-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
    <Button type="submit" className="w-full" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null}{pending ? "Sending…" : "Join the waitlist"}</Button>
  </form>;
}
