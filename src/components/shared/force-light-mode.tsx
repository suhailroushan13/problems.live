"use client";

import { useLayoutEffect } from "react";

/**
 * Forces the light theme for as long as this is mounted, regardless of the
 * visitor's saved "theme" preference (see the blocking script in
 * `app/layout.tsx` that applies "dark" from localStorage before hydration).
 * Restores whatever the class was on unmount, so leaving the page returns
 * the rest of the app to the visitor's actual preference.
 */
export function ForceLightMode() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  return null;
}
