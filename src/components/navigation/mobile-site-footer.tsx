"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Logo } from "./logo";

type FooterLink = { href: string; label: string };

function FooterAccordion({
  heading,
  links,
}: {
  heading: string;
  links: FooterLink[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="border-b border-hairline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="tap flex min-h-12 w-full items-center justify-between py-3 text-left text-base font-semibold text-foreground"
      >
        {heading}
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <nav aria-label={heading} className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 pb-4 pt-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                tabIndex={open ? undefined : -1}
                className="tap inline-flex min-h-8 items-center text-[0.9375rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}

export function MobileSiteFooter({
  exploreLinks,
  legalLinks,
  askLinks,
  version,
}: {
  exploreLinks: FooterLink[];
  legalLinks: FooterLink[];
  askLinks: FooterLink[];
  version: string;
}) {
  return (
    <div className="page py-7">
      <div className="max-w-sm pb-6">
        <Logo className="text-lg sm:text-lg" />
        <p className="mt-3 text-[0.9375rem] leading-6 text-muted-foreground">
          An open list of problems worth solving, written by the people who have them.
        </p>
      </div>

      <div className="border-t border-hairline">
        <FooterAccordion heading="Explore" links={exploreLinks} />
        <FooterAccordion heading="Legal" links={legalLinks} />
      </div>

      <nav aria-label="Ask an AI" className="flex flex-wrap gap-x-2 gap-y-1 border-b border-hairline py-5 text-[0.8125rem] text-muted-foreground">
        {askLinks.map((link, index) => (
          <span key={link.href} className="inline-flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <a href={link.href} target="_blank" rel="noreferrer" className="tap min-h-8 inline-flex items-center transition-colors hover:text-foreground">
              {link.label}
            </a>
          </span>
        ))}
      </nav>

      <div className="flex items-center justify-between pt-5 text-[0.8125rem] text-muted-foreground">
        <span className="num" title={`Version ${version}`}>v{version}</span>
        <Link href="/llms.txt" className="tap min-h-8 inline-flex items-center transition-colors hover:text-foreground">
          llms.txt
        </Link>
      </div>

      <p className="mt-6 max-w-xs text-[0.8125rem] leading-5 text-muted-foreground">
        © 2026 problems.live. Built for problems worth solving.
      </p>
    </div>
  );
}
