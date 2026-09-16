import Link from "next/link";
import { GithubIcon } from "./social-icons";
import { GITHUB_REPO_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Links to the public repo — this project is open source and takes PRs. */
export function GithubBadge({ className }: { className?: string }) {
  return (
    <Link
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md px-1 text-[0.8125rem] leading-none font-medium text-muted-foreground transition-colors hover:text-foreground sm:h-7 sm:gap-1.5 sm:rounded-full sm:border sm:border-hairline sm:bg-elevated sm:px-3 sm:text-xs sm:text-foreground sm:shadow-xs sm:hover:border-rule sm:hover:bg-sunken",
        className
      )}
    >
      <GithubIcon className="size-3.5" />
      Open source on GitHub
    </Link>
  );
}
