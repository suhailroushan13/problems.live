import { parseBioSegments } from "@/lib/utils/text";
import { cn } from "@/lib/utils";

/**
 * Renders a profile bio with a small, safe Markdown subset — **bold**,
 * *italic*, line breaks, and auto-linked URLs. Every string here is still
 * escaped by React; `dangerouslySetInnerHTML` is never used.
 */
export function BioText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <p className={cn("prose-body", className)}>
      {children.split("\n").map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 ? <br /> : null}
          {parseBioSegments(line).map((segment, index) => {
            switch (segment.kind) {
              case "bold":
                return <strong key={index}>{segment.value}</strong>;
              case "italic":
                return <em key={index}>{segment.value}</em>;
              case "link":
                return (
                  <a
                    key={index}
                    href={segment.href}
                    target="_blank"
                    rel="nofollow noopener noreferrer ugc"
                    className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
                  >
                    {segment.value}
                  </a>
                );
              default:
                return <span key={index}>{segment.value}</span>;
            }
          })}
        </span>
      ))}
    </p>
  );
}
