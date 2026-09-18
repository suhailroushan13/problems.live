"use client";

import { useEffect, useState } from "react";
import { WAITLIST_APPROVED_STORAGE_KEY } from "@/lib/constants";

/**
 * Reads the localStorage flag set by /approved/[token] after a waitlist
 * approval email link is confirmed. Starts `false` on every render (server
 * and first client paint) since localStorage isn't available during SSR,
 * then updates once mounted.
 */
export function useWaitlistApproved(): boolean {
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    // Named so it can both run once on mount and re-run when the flag
    // changes in another tab (e.g. the approval link opened in a fresh tab).
    const sync = () => {
      try {
        setApproved(window.localStorage.getItem(WAITLIST_APPROVED_STORAGE_KEY) === "true");
      } catch {
        setApproved(false);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return approved;
}
