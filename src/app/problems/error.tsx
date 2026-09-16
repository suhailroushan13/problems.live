"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProblemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[problems] failed to load", error);
  }, [error]);

  return (
    <div className="page flex min-h-[50vh] items-center justify-center pb-28 sm:pb-12">
      <div className="max-w-sm text-center">
        <h1 className="text-h3 text-foreground">Couldn’t load problems</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Check your connection and try again.
        </p>
        <Button onClick={reset} className="mt-6 rounded-md">Try again</Button>
      </div>
    </div>
  );
}
