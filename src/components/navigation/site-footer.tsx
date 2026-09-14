import Link from "next/link";
import { Logo } from "./logo";

const LINKS = [
  { href: "/problems", label: "Problems" },
  { href: "/categories", label: "Categories" },
  { href: "/solutions", label: "Solutions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/guidelines", label: "Guidelines" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
            An open list of problems worth solving, written by the people who
            have them.
          </p>
        </div>

        <nav className="-my-2 flex flex-wrap gap-x-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap inline-flex min-h-10 items-center text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
