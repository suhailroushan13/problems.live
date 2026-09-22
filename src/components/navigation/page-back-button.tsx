"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function hasLocalBackPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/problems/new" ||
    pathname.startsWith("/admin") ||
    /^\/u\/[^/]+$/.test(pathname) ||
    (/^\/categories\/[^/]+$/.test(pathname)) ||
    (/^\/problems\/[^/]+(?:\/edit)?$/.test(pathname))
  );
}

/** A calm, consistent escape hatch for every top-level page. */
export function PageBackButton({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  // Onboarding owns its back action inside its setup card, where it is part
  // of the flow rather than a detached control beneath the site header.
  if (hasLocalBackPath(pathname) || (pathname === "/onboard" && !embedded)) return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <div className={embedded ? "" : pathname === "/login" ? "page max-w-[68rem] pt-3 sm:pt-4" : "page pt-3 sm:pt-4"}>
      <button
        type="button"
        onClick={goBack}
        className={embedded
          ? "inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-tint px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          : "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back
      </button>
    </div>
  );
}
