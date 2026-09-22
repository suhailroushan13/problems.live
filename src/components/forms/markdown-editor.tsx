"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Code,
  Eye,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Strikethrough,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Selection = { start: number; end: number };

/**
 * A Markdown editor in the spirit of Reddit's post composer: a plain
 * `<textarea>` (so the value is always ordinary Markdown text — copy/paste
 * and plain typing just work) with a formatting toolbar that inserts
 * Markdown syntax around the selection, a paste-to-upload handler for
 * images, and a Preview tab rendered through the same `MarkdownContent`
 * component used on the published page.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  minRows = 6,
  folder = "problems",
  className,
  compact = false,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  folder?: "problems" | "solutions";
  className?: string;
  compact?: boolean;
  "aria-invalid"?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<Selection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);

  // Selection restoration has to happen after the controlled value actually
  // reaches the DOM, not right after calling onChange — the textarea's own
  // string is still stale at that point.
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    const textarea = textareaRef.current;
    if (!pending || !textarea) return;
    textarea.setSelectionRange(pending.start, pending.end);
    pendingSelection.current = null;
  }, [value]);

  function wrapSelection(before: string, after: string = before, placeholderText = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: current } = textarea;
    const selected = current.slice(start, end) || placeholderText;
    const next = current.slice(0, start) + before + selected + after + current.slice(end);
    const cursorStart = start + before.length;
    pendingSelection.current = { start: cursorStart, end: cursorStart + selected.length };
    textarea.focus();
    onChange(next);
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: current } = textarea;
    const lineStart = current.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = current.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? current.length : lineEndIndex;

    const block = current.slice(lineStart, lineEnd);
    const nextBlock = block
      .split("\n")
      .map((line) => (line ? `${prefix}${line}` : line))
      .join("\n");
    const next = current.slice(0, lineStart) + nextBlock + current.slice(lineEnd);

    pendingSelection.current = {
      start: start + prefix.length,
      end: end + (nextBlock.length - block.length),
    };
    textarea.focus();
    onChange(next);
  }

  function insertLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: current } = textarea;
    const label = current.slice(start, end) || "link text";
    const urlPlaceholder = "url";
    const snippet = `[${label}](${urlPlaceholder})`;
    const next = current.slice(0, start) + snippet + current.slice(end);
    // Leaves "url" selected so typing the address is a single motion.
    const urlStart = start + label.length + 3;
    pendingSelection.current = { start: urlStart, end: urlStart + urlPlaceholder.length };
    textarea.focus();
    onChange(next);
  }

  function insertImageMarkdown(url: string, alt: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: current } = textarea;
    const needsLeadingBreak = start > 0 && current[start - 1] !== "\n";
    const snippet = `${needsLeadingBreak ? "\n\n" : ""}![${alt}](${url})\n`;
    const next = current.slice(0, start) + snippet + current.slice(end);
    const cursor = start + snippet.length;
    pendingSelection.current = { start: cursor, end: cursor };
    textarea.focus();
    onChange(next);
  }

  async function uploadAndInsertImage(file: File) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) ||
      file.size > MAX_IMAGE_BYTES
    ) {
      toast.error(
        `Images must be JPG, PNG, WebP, GIF or AVIF under ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`
      );
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("folder", folder);
      form.append("files", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as {
        images?: { url: string }[];
        error?: string;
      };
      if (!response.ok || !data.images?.[0]) {
        toast.error(data.error ?? "Image upload failed.");
        return;
      }
      insertImageMarkdown(data.images[0].url, file.name.replace(/\.[a-z0-9]+$/i, ""));
    } catch {
      toast.error("Image upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/")
    );
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    event.preventDefault();
    void uploadAndInsertImage(file);
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25",
        ariaInvalid && "border-destructive focus-within:ring-destructive/15",
        className
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-0.5 border-b border-hairline px-1.5 py-1", compact && "py-0.5 [&>button]:size-7 [&>button_svg]:size-3.5")}>
        <ToolbarButton label="Bold" onClick={() => wrapSelection("**", "**", "bold text")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => wrapSelection("*", "*", "italic text")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          onClick={() => wrapSelection("~~", "~~", "strikethrough")}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Inline code" onClick={() => wrapSelection("`", "`", "code")}>
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={insertLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Quote" onClick={() => prefixLines("> ")}>
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => prefixLines("- ")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => prefixLines("1. ")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Upload image"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" />}
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-sunken p-0.5">
          <ModeButton active={mode === "write"} onClick={() => setMode("write")}>
            <Pencil className="size-3.5" />
            Write
          </ModeButton>
          <ModeButton active={mode === "preview"} onClick={() => setMode("preview")}>
            <Eye className="size-3.5" />
            Preview
          </ModeButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadAndInsertImage(file);
            event.target.value = "";
          }}
        />
      </div>

      {mode === "write" ? (
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          rows={minRows}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          className={cn("rounded-none border-0 shadow-none focus-visible:ring-0", compact && "min-h-24 py-2")}
        />
      ) : (
        <div
          className={cn("min-h-36 px-3.5 py-3", compact && "min-h-24 py-2")}
          style={{ minHeight: `${minRows * (compact ? 1.5 : 1.6)}rem` }}
        >
          {value.trim() ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="tap inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-elevated text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
