"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveWaitlistSignup, rejectWaitlistSignup } from "@/actions/admin";

export function WaitlistSignupActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inFlight, setInFlight] = useState<"approve" | "reject" | null>(null);

  function run(kind: "approve" | "reject") {
    setInFlight(kind);
    startTransition(async () => {
      const result = kind === "approve" ? await approveWaitlistSignup(id) : await rejectWaitlistSignup(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" onClick={() => run("approve")} disabled={pending}>
        {pending && inFlight === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => run("reject")}
        disabled={pending}
      >
        {pending && inFlight === "reject" ? <Loader2 className="animate-spin" /> : <X />}
        Reject
      </Button>
    </div>
  );
}
