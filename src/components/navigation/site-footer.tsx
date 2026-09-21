"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "./logo";
import { MobileSiteFooter } from "./mobile-site-footer";
import { version as APP_VERSION } from "../../../package.json";

const EXPLORE_LINKS = [
  { href: "/problems", label: "Browse problems" },
  { href: "/categories", label: "Categories" },
  { href: "/solutions", label: "Solutions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/how-it-works", label: "Score & Credits" },
  { href: "/contribute", label: "Contribute" },
];

const LEGAL_LINKS = [
  { href: "/guidelines", label: "Community guidelines" },
  { href: "/terms", label: "Terms & conditions" },
  { href: "/privacy", label: "Privacy policy" },
];

const ASK_INTENT =
  "I want help understanding and solving a real-world problem. Guide me through clarifying the problem, identifying who has it, and exploring practical solutions.";
const ASK_QUERY = encodeURIComponent(ASK_INTENT);

const ASK_LINKS = [
  { href: `https://chatgpt.com/?q=${ASK_QUERY}`, label: "Ask GPT" },
  { href: `https://claude.ai/new?q=${ASK_QUERY}`, label: "Ask Claude" },
  { href: `https://grok.com/?q=${ASK_QUERY}`, label: "Ask Grok" },
  { href: `https://www.perplexity.ai/?q=${ASK_QUERY}`, label: "Ask Perplexity" },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <footer className="mt-12 border-t border-hairline sm:mt-24">
      <div className="sm:hidden">
        <MobileSiteFooter
          exploreLinks={EXPLORE_LINKS}
          legalLinks={LEGAL_LINKS}
          askLinks={ASK_LINKS}
          version={APP_VERSION}
        />
      </div>

      <div className="hidden sm:block">
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
          className="page block pb-6 text-center sm:pb-10"
        >
          <FooterWordmark />
        </Link>
        {pathname === "/" ? <DirectoryViewToggle /> : null}

        <nav aria-label="Ask an AI" className="page flex flex-wrap justify-center gap-x-2 gap-y-1 border-t border-hairline py-4 text-xs text-muted-foreground">
          {ASK_LINKS.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <a href={link.href} target="_blank" rel="noreferrer" className="tap transition-colors hover:text-foreground">
                {link.label}
              </a>
            </span>
          ))}
        </nav>

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
      </div>
    </footer>
  );
}

/**
 * The alternate machine-readable directory is a landing-page affordance.
 * Its URL state keeps the selected representation shareable and lets the
 * server render the appropriate directory without exposing it in the app.
 */
function DirectoryViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineView = searchParams.get("machine") === "1";

  const setView = (view: "human" | "machine") => {
    const next = new URLSearchParams(searchParams.toString());
    if (view === "machine") {
      next.set("machine", "1");
    } else {
      next.delete("machine");
    }
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

  return (
    <div className="page -mt-3 flex justify-center pb-7 sm:-mt-6 sm:pb-10">
      <div
        role="tablist"
        aria-label="Problems directory format"
        className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1"
      >
        <DirectoryViewOption label="Human" active={!machineView} onClick={() => setView("human")} />
        <DirectoryViewOption label="Machine" active={machineView} onClick={() => setView("machine")} />
      </div>
    </div>
  );
}

function DirectoryViewOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`tap flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors ${
        active ? "bg-sunken text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${active ? "bg-brand" : "bg-muted-foreground/50"}`}
      />
      {label}
    </button>
  );
}

function FooterWordmark() {
  return (
    <span
      className="block text-brand"
      style={{
        fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
        fontWeight: 800,
        fontSize: "clamp(2.5rem, 11vw, 7rem)",
        lineHeight: 1,
        letterSpacing: "-0.06em",
      }}
    >
      problems.live
    </span>
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
