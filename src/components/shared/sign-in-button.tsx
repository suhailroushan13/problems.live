"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.17-2 3.44-4.95 3.44-8.46Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.71v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.71a11.51 11.51 0 0 0 0 10.32l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.62 15.1.5 12 .5 7.52.5 3.65 3.07 1.71 6.84l3.84 2.98C6.46 7.1 9 5.08 12 5.08Z"
      />
    </svg>
  );
}

/**
 * Kicks off the Google flow and comes back to whatever page the user was on.
 * A plain link — no client-side auth state to get out of sync.
 */
export function SignInButton({
  children = "Sign in",
  showIcon = true,
  next,
  className,
  ...props
}: {
  children?: ReactNode;
  showIcon?: boolean;
  next?: string;
} & ComponentProps<typeof Button>) {
  const pathname = usePathname();
  const target = next ?? pathname ?? "/";

  return (
    <Button asChild className={className} {...props}>
      <a href={`/api/auth/google?next=${encodeURIComponent(target)}`}>
        {showIcon ? <GoogleMark /> : null}
        {children}
      </a>
    </Button>
  );
}
