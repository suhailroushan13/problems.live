"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/problems", label: "Problems" },
  { href: "/categories", label: "Categories" },
  { href: "/solutions", label: "Solutions" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {NAV_LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap pill inline-flex min-h-10 items-center px-3.5 text-sm font-semibold transition-colors",
              active
                ? "bg-sunken text-foreground"
                : "text-foreground/70 hover:bg-sunken hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
