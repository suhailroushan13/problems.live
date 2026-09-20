"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm({ credits, admin = false }: { credits: number; admin?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await sendInvite({ name: form.get("name"), email: form.get("email") });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSent(true);
      event.currentTarget.reset();
      toast.success(result.message);
    });
  }
  if (!admin && credits === 0) return <p className="text-sm text-muted-foreground">You&apos;ve used all five invitations.</p>;
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <div><Label htmlFor="invite-name">Name</Label><Input id="invite-name" name="name" className="mt-2" required /></div>
    <div><Label htmlFor="invite-email">Email</Label><Input id="invite-email" name="email" type="email" className="mt-2" required /></div>
    <div className="sm:col-span-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{admin ? "Unlimited invitations." : `${credits} invitation${credits === 1 ? "" : "s"} remaining.`}</p><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Send />}{pending ? "Sending…" : sent ? "Send another" : "Send invitation"}</Button></div>
  </form>;
}
