"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind's `sm` breakpoint, used app-wide as the mobile cutoff. */
const MOBILE_BREAKPOINT = 640;

/**
 * Defaults to `false` so server-rendered markup matches the desktop layout
 * on first paint; corrects itself client-side once the viewport is known.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
