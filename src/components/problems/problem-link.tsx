"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type ProblemLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  problemId: string;
  slug: string;
};

/** Records an intentional same-tab problem open without delaying navigation. */
export function ProblemLink({
  problemId,
  slug,
  onClick,
  ...props
}: ProblemLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const url = `/api/problems/${problemId}/click`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }
    void fetch(url, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
  }

  return <Link href={`/problems/${slug}`} onClick={handleClick} {...props} />;
}
