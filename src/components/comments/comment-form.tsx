"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createComment } from "@/actions/comments";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/current-user";

export function CommentForm({
  problemId,
  solutionId,
  parentId,
  user,
  placeholder = "Add to the discussion…",
  autoFocus = false,
  compact = false,
  onPosted,
  onCancel,
  className,
}: {
  problemId: string;
  solutionId?: string | null;
  parentId?: string | null;
  user: Pick<SessionUser, "name" | "username" | "avatar"> | null;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onPosted?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [focused, setFocused] = useState(autoFocus);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return (
      <div
        className={cn("flex flex-col items-start gap-3 rounded-xl border border-dashed border-hairline bg-sunken/40 p-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Sign in to join the discussion.
        </p>
        <Button asChild size="sm">
          <a href={`/api/auth/google?next=${encodeURIComponent(pathname)}`}>
            Sign in with Google
          </a>
        </Button>
      </div>
    );
  }

  function submit() {
    const trimmed = content.trim();
    if (trimmed.length < 2) return;

    startTransition(async () => {
      const result = await createComment({
        problemId,
        solutionId: solutionId ?? null,
        parentId: parentId ?? null,
        content: trimmed,
        isAnonymous,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.message) toast.info(result.message);
      setContent("");
      setIsAnonymous(false);
      setFocused(false);
      onPosted?.();
      router.refresh();
    });
  }

  const expanded = focused || content.length > 0;

  return (
    <div className={cn("flex gap-3", className)}>
      {!compact ? (
        <UserAvatar
          name={user.name}
          username={user.username}
          avatar={user.avatar}
          size="md"
          className="mt-0.5 hidden sm:flex"
        />
      ) : null}

      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 4000))}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          rows={expanded ? 4 : 1}
          autoFocus={autoFocus}
          className={cn("resize-none transition-all",
            expanded ? "min-h-24" : "min-h-10"
          )}
          onKeyDown={(event) => {
            // ⌘/Ctrl+Enter to post — expected in any comment box.
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />

        {expanded ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={(value) => setIsAnonymous(value === true)}
              />
              Post anonymously
            </label>

            <div className="flex items-center gap-2">
              {onCancel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setContent("");
                    setFocused(false);
                    onCancel();
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={submit}
                disabled={pending || content.trim().length < 2}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Posting…
                  </>
                ) : parentId ? ("Reply"
                ) : ("Comment"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
