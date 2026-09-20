"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createInviteLink } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteLinkCard({ credits, admin = false }: { credits: number; admin?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);

  function generate() {
    startTransition(async () => {
      const result = await createInviteLink();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUrl(result.data.url);
    });
  }

  function copy() {
    if (!url) return;
    if (navigator.share) {
      navigator.share({ title: "Join problems.live", url }).catch(() => undefined);
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied."))
      .catch(() => toast.error("Couldn't copy the link."));
  }

  if (!admin && credits === 0 && !url) {
    return <p className="text-sm text-muted-foreground">You&apos;ve used all five invitations.</p>;
  }

  return (
    <div className="space-y-3">
      {url ? (
        <>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy invite link">
              <Copy />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy this now — for your security it won&apos;t be shown again. It works once, for whoever opens it first.
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{admin ? "Unlimited invitations." : `${credits} invitation${credits === 1 ? "" : "s"} remaining.`}</p>
          <Button type="button" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
            {pending ? "Creating…" : "Create invite link"}
          </Button>
        </div>
      )}
    </div>
  );
}
