"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, ChevronLeft, ChevronRight, ClipboardList, FileText, FolderTree, Gauge, Inbox, Send, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({
  isAdmin,
  pendingReports,
  pendingModeration,
  pendingCategories,
  pendingWaitlist,
}: {
  isAdmin: boolean;
  pendingReports: number;
  pendingModeration: number;
  pendingCategories: number;
  pendingWaitlist: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    { href: "/admin/users", label: "Users", icon: Users, badge: 0, adminOnly: true },
    {
      href: "/admin/waiting-list",
      label: "Waiting list",
      icon: ClipboardList,
      badge: pendingWaitlist,
      adminOnly: true,
    },
    { href: "/admin/invites", label: "Invite", icon: Send, badge: 0, adminOnly: true },
    { href: "/admin", label: "Overview", icon: Gauge, badge: 0, adminOnly: false },
    {
      href: "/admin/moderation",
      label: "Moderation queue",
      icon: ShieldCheck,
      badge: pendingModeration,
      adminOnly: false,
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: BellRing,
      badge: pendingReports,
      adminOnly: false,
    },
    { href: "/admin/problems", label: "Problems", icon: FileText, badge: 0, adminOnly: false },
    {
      href: "/admin/categories",
      label: "Categories",
      icon: FolderTree,
      badge: pendingCategories,
      adminOnly: true,
    },
    { href: "/admin/settings", label: "Settings", icon: Settings, badge: 0, adminOnly: true },
  ].filter((link) => isAdmin || !link.adminOnly);

  return (
    <aside className={cn("sticky top-0 hidden h-full shrink-0 overflow-y-auto border-r border-hairline bg-card px-3 py-5 transition-[width] duration-200 lg:flex lg:flex-col", collapsed ? "w-20" : "w-64")}>
      <div className="mb-8 flex items-center justify-between px-2">
        {!collapsed ? <div><p className="label text-brand">problems.live</p><p className="mt-1 text-sm font-semibold">Control room</p></div> : <Inbox className="mx-auto size-5 text-brand" />}
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</button>
      </div>
      <nav className="space-y-1">
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
            title={collapsed ? link.label : undefined}
            className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-brand-muted text-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-brand" : "text-muted-foreground group-hover:text-foreground")} />
            {!collapsed ? link.label : null}
            {link.badge > 0 ? (
              <span className={cn("num rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground", collapsed && "absolute top-1 right-1")}>
                {link.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
      </nav>
    </aside>
  );
}
