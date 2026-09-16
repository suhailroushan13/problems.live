import Link from "next/link";
import { useId } from "react";
import { Logo } from "./logo";
import { version as APP_VERSION } from "../../../package.json";

const EXPLORE_LINKS = [
  { href: "/problems", label: "Browse problems" },
  { href: "/categories", label: "Categories" },
  { href: "/solutions", label: "Solutions" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const LEGAL_LINKS = [
  { href: "/guidelines", label: "Community guidelines" },
  { href: "/terms", label: "Terms & conditions" },
  { href: "/privacy", label: "Privacy policy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline pb-24 lg:pb-0">
      <div className="page grid gap-10 py-12 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-16 sm:py-16">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
            An open list of problems worth solving, written by the people who
            have them.
          </p>
        </div>

        <FooterNav heading="Explore" links={EXPLORE_LINKS} />
        <FooterNav heading="Legal" links={LEGAL_LINKS} />
      </div>

      <Link
        href="/"
        aria-label="problems.live, home"
        className="page block pb-6 text-center transition-opacity hover:opacity-80 sm:pb-10"
      >
        <FooterWordmark />
      </Link>

      <div className="page flex flex-col items-center gap-2 border-t border-hairline py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} problems.live. Built for problems worth
          solving.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/llms.txt"
            className="tap transition-colors hover:text-foreground"
          >
            llms.txt
          </Link>
          <span aria-hidden="true">·</span>
          <span className="num" title={`Version ${APP_VERSION}`}>
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Renders the wordmark as real SVG text with a gradient fill instead of the
 * CSS `background-clip: text` trick. At this size, `-webkit-text-fill-color:
 * transparent` masking is prone to a Chromium/WebKit compositing bug where a
 * glyph's stroke (most visibly the "p" stem) paints as transparent until a
 * forced repaint — e.g. selecting the text — reveals it. SVG `<text>` paints
 * the font's own glyph outlines directly with the gradient, so there's no
 * separate mask layer to fall out of sync with the glyph paint.
 */
function FooterWordmark() {
  const gradientId = useId();

  return (
    <svg
      aria-hidden="true"
      className="mx-auto block h-[clamp(2.5rem,11vw,7rem)] w-full overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--foreground)" />
          <stop offset="55%" stopColor="var(--foreground)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        dy="0.32em"
        textAnchor="middle"
        fill={`url(#${gradientId})`}
        style={{
          fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "clamp(2.5rem, 11vw, 7rem)",
          letterSpacing: "-0.06em",
        }}
      >
        problems.live
      </text>
    </svg>
  );
}

function FooterNav({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading} className="flex flex-col items-start gap-1">
      <p className="label mb-2 text-muted-foreground">{heading}</p>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="tap inline-flex min-h-9 items-center text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
