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
        "tap inline-flex h-7 items-center gap-1.5 rounded-full border border-hairline bg-elevated px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:border-rule hover:bg-sunken",
        className
      )}
    >
      <GithubIcon className="size-3.5" />
      Open source on GitHub
    </Link>
  );
}
