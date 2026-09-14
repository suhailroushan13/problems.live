import { segmentText } from "@/lib/utils/text";
import { cn } from "@/lib/utils";

/**
 * Renders user-authored text. React escapes every string it renders, and URLs
 * are turned into links from parsed segments — `dangerouslySetInnerHTML` is
 * never used anywhere in this app.
 */
export function SafeText({
  children,
  className,
  linkify = true,
}: {
  children: string;
  className?: string;
  linkify?: boolean;
}) {
  if (!linkify) {
    return <div className={cn("prose-body", className)}>{children}</div>;
  }

  return (
    <div className={cn("prose-body", className)}>
      {segmentText(children).map((segment, index) =>
        segment.kind === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="nofollow noopener noreferrer ugc"
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
          >
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </div>
  );
}
