import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer ugc"
      className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary, unsized user/markdown URLs
      <img src={src} alt={alt ?? ""} loading="lazy" />
    ) : null,
};

/**
 * Renders user-authored Markdown. react-markdown turns the parsed AST
 * straight into React elements — it never calls `dangerouslySetInnerHTML` —
 * so literal HTML typed into the source shows up as escaped text rather than
 * running, the same guarantee `SafeText` gives plain-text fields.
 */
export function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
