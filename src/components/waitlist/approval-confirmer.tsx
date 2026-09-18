"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WAITLIST_APPROVED_STORAGE_KEY } from "@/lib/constants";

/** Unlocks the client-side "approved" gate on the Post a Problem button. */
export function ApprovalConfirmer() {
  useEffect(() => {
    try {
      window.localStorage.setItem(WAITLIST_APPROVED_STORAGE_KEY, "true");
    } catch {
      // Private browsing / blocked storage — the button falls back to the
      // waitlist link, which is safe, just less convenient.
    }
  }, []);

  return (
    <Button asChild className="w-full">
      <a href="/api/auth/google?next=%2Fproblems%2Fnew">Continue with Google</a>
    </Button>
  );
}
