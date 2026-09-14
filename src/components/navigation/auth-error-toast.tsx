"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  invalid_request: "That sign-in link expired. Please try again.",
  state_mismatch: "Sign-in could not be verified. Please try again.",
  email_unverified:"Your Google account does not have a verified email address yet.",
  signin_failed: "We couldn't sign you in. Please try again.",
};

/**
 * The OAuth callback cannot render UI, so it redirects with `?auth_error=`.
 * This surfaces it once, then cleans the URL so a refresh does not repeat it.
 */
export function AuthErrorToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("auth_error");
    if (!code) return;

    toast.error(MESSAGES[code] ?? "We couldn't sign you in. Please try again.");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth_error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
