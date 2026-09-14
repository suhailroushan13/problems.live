"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({
  isAdmin,
  pendingReports,
  pendingModeration,
  pendingCategories,
}: {
  isAdmin: boolean;
  pendingReports: number;
  pendingModeration: number;
  pendingCategories: number;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Overview", badge: 0, adminOnly: false },
    {
      href: "/admin/moderation",
      label: "Moderation queue",
      badge: pendingModeration,
      adminOnly: false,
    },
    {
      href: "/admin/reports",
      label: "Reports",
      badge: pendingReports,
      adminOnly: false,
    },
    { href: "/admin/problems", label: "Problems", badge: 0, adminOnly: false },
    {
      href: "/admin/categories",
      label: "Categories",
      badge: pendingCategories,
      adminOnly: true,
    },
    { href: "/admin/users", label: "Users", badge: 0, adminOnly: true },
    { href: "/admin/settings", label: "Settings", badge: 0, adminOnly: true },
  ].filter((link) => isAdmin || !link.adminOnly);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-hairline no-scrollbar">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex items-center gap-2 px-3 py-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
            {link.badge > 0 ? (
              <span className="num rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                {link.badge}
              </span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
