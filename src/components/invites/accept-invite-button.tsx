"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button size="lg" className="w-full" disabled={pending} onClick={() => startTransition(async () => { const result = await acceptInvite(token); if (!result.ok) { toast.error(result.error); return; } toast.success(result.message); router.replace("/onboard?next=/invites"); router.refresh(); })}>{pending ? <Loader2 className="animate-spin" /> : <Check />}{pending ? "Accepting…" : "Accept invitation"}</Button>;
}
