import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { timeAgoLong } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { MaybeAuthor } from "@/types";
import { AnonymousAvatar, UserAvatar } from "./user-avatar";

/**
 * An author byline. When `author` is null the post was published anonymously —
 * there is nothing to link to, by design.
 */
export function AuthorLine({
  author,
  createdAt,
  editedAt,
  showAvatar = true,
  showName = true,
  avatarSize = "sm",
  className,
}: {
  author: MaybeAuthor;
  createdAt: string;
  editedAt?: string | null;
  showAvatar?: boolean;
  /** Off on directory listings — who wrote it is only revealed on the problem page. */
  showName?: boolean;
  avatarSize?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 text-muted-foreground",
        avatarSize === "md" ? "text-sm" : "text-xs",
        className
      )}
    >
      {showAvatar ? (
        author ? (
          <UserAvatar
            name={author.name}
            username={author.username}
            avatar={author.avatar}
            size={avatarSize}
          />
        ) : (
          <AnonymousAvatar size={avatarSize} />
        )
      ) : null}

      {showName ? (
        author ? (
          <Link
            href={`/u/${author.username}`}
            className={cn(
              "inline-flex min-w-0 items-center gap-1 truncate text-foreground/80 transition-colors hover:text-foreground",
              avatarSize === "md" && "font-medium text-foreground"
            )}
          >
            <span className="truncate">{author.name}</span>
            {author.verified ? (
              <BadgeCheck
                className="size-3.5 shrink-0 text-brand"
                aria-label="Verified"
              />
            ) : null}
          </Link>
        ) : (
          <span className="truncate text-foreground/70">Anonymous</span>
        )
      ) : null}

      {showAvatar || showName ? <span aria-hidden="true">·</span> : null}
      <time dateTime={createdAt} className="whitespace-nowrap">
        {timeAgoLong(createdAt)}
      </time>

      {editedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">edited</span>
        </>
      ) : null}
    </div>
  );
}
